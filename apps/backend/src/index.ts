import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import Docker from "dockerode";
import newman from "newman";
import express from "express";
import cors from "cors";
import winston from "winston";
import { PassThrough } from "stream";

// Logger configuration
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Ensure all logs go to stderr to prevent corrupting MCP stdio
    new winston.transports.Console({ stderrLevels: ["info", "error", "warn", "debug"], forceConsole: true })
  ],
});

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

// Setup MCP Server
const server = new Server(
  {
    name: "mcp-gateway-sandbox",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tools setup
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "execute_sandbox_code",
        description: "Ejecuta código TypeScript/JavaScript o Python de forma segura dentro de un contenedor aislado.",
        inputSchema: {
          type: "object",
          properties: {
            language: {
              type: "string",
              enum: ["javascript", "typescript", "python"],
            },
            code: {
              type: "string",
            },
          },
          required: ["language", "code"],
        },
      },
      {
        name: "run_postman_collection",
        description: "Ejecuta pruebas de integración automatizadas basadas en colecciones de Postman.",
        inputSchema: {
          type: "object",
          properties: {
            collectionUrl: {
              type: "string",
            },
          },
          required: ["collectionUrl"],
        },
      },
    ],
  };
});

async function runDocker(image: string, cmd: string[]) {
  let container: Docker.Container | null = null;
  let stdoutData = "";
  let stderrData = "";
  try {
    logger.info({ message: "Creating container", image, cmd });
    container = await docker.createContainer({
      Image: image,
      Cmd: cmd,
      HostConfig: {
        NetworkMode: "none",
        Memory: 50 * 1024 * 1024, // 50MB
      },
      Tty: false,
    });

    const stream = await container.attach({ stream: true, stdout: true, stderr: true });
    
    // Docker demux
    const stdoutStream = new PassThrough();
    const stderrStream = new PassThrough();

    stdoutStream.on("data", (chunk) => {
      stdoutData += chunk.toString("utf8");
    });

    stderrStream.on("data", (chunk) => {
      stderrData += chunk.toString("utf8");
    });

    docker.modem.demuxStream(stream, stdoutStream, stderrStream);

    logger.info({ message: "Starting container", id: container.id });
    await container.start();

    // 5 second timeout
    let isTimeout = false;
    const timeoutId = setTimeout(async () => {
      isTimeout = true;
      try {
        if (container) {
            logger.warn({ message: "Timeout reached, killing container", id: container.id });
            await container.kill();
        }
      } catch (e) {
        logger.error({ message: "Error killing container", error: e });
      }
    }, 5000);

    const { StatusCode } = await container.wait();
    clearTimeout(timeoutId);

    logger.info({ message: "Container exited", id: container.id, exitCode: StatusCode });
    await container.remove();

    return {
      stdout: stdoutData,
      stderr: isTimeout ? stderrData + "\n[Error] Execution timed out after 5 seconds" : stderrData,
      exitCode: isTimeout ? -1 : StatusCode,
    };
  } catch (error: any) {
    logger.error({ message: "Docker execution error", error: error.message });
    if (container) {
      try { await container.remove({ force: true }); } catch (e) {}
    }
    return { stdout: "", stderr: error.message, exitCode: -1 };
  }
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "execute_sandbox_code") {
    const { language, code } = request.params.arguments as { language: string; code: string };
    let image = "";
    let cmd: string[] = [];

    if (language === "javascript" || language === "typescript") {
      // Using node:22-alpine which supports --experimental-strip-types
      image = "node:22-alpine";
      cmd = ["node", "--experimental-strip-types", "-e", code];
    } else if (language === "python") {
      image = "python:alpine";
      cmd = ["python", "-c", code];
    } else {
      throw new McpError(ErrorCode.InvalidParams, `Unsupported language: ${language}`);
    }

    try {
      // Pull images if missing? In a real system yes, but here let's assume they exist or we try to pull
      const result = await runDocker(image, cmd);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (e: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${e.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (request.params.name === "run_postman_collection") {
    const { collectionUrl } = request.params.arguments as { collectionUrl: string };
    
    return new Promise((resolve) => {
      logger.info({ message: "Running Postman collection", url: collectionUrl });
      newman.run(
        {
          collection: collectionUrl,
        },
        (err: Error | null, summary: any) => {
          if (err) {
            logger.error({ message: "Newman execution failed", error: err.message });
            resolve({
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ error: err.message }),
                },
              ],
              isError: true,
            });
            return;
          }

          const result = {
            success: summary.run.failures.length === 0,
            stats: {
              requests: summary.run.stats.requests,
              assertions: summary.run.stats.assertions,
            },
            failures: summary.run.failures.map((f: any) => ({
              error: f.error.message,
              source: f.source?.name,
            })),
          };

          logger.info({ message: "Newman execution finished", success: result.success });
          resolve({
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          });
        }
      );
    });
  }

  throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${request.params.name}`);
});

async function main() {
  // Start Express API Server for Next.js frontend
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Proxy API for manual execution from the frontend Dashboard
  app.post("/api/sandbox", async (req, res) => {
    try {
      const { language, code } = req.body;
      if (!language || !code) {
        return res.status(400).json({ error: "Missing language or code" });
      }

      let image = "";
      let cmd: string[] = [];
      if (language === "javascript" || language === "typescript") {
        image = "node:22-alpine";
        cmd = ["node", "--experimental-strip-types", "-e", code];
      } else if (language === "python") {
        image = "python:alpine";
        cmd = ["python", "-c", code];
      } else {
        return res.status(400).json({ error: "Unsupported language" });
      }

      const result = await runDocker(image, cmd);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/postman", async (req, res) => {
    try {
      const { collectionUrl } = req.body;
      if (!collectionUrl) return res.status(400).json({ error: "Missing collectionUrl" });
      
      newman.run({ collection: collectionUrl }, (err: Error | null, summary: any) => {
          if (err) {
             return res.status(500).json({ error: err.message });
          }
          res.json({
            success: summary.run.failures.length === 0,
            stats: summary.run.stats,
            failures: summary.run.failures.map((f: any) => ({
              error: f.error.message,
              source: f.source?.name,
            })),
          });
      });
    } catch (e: any) {
       res.status(500).json({ error: e.message });
    }
  });

  const HTTP_PORT = process.env.PORT || 4000;
  app.listen(HTTP_PORT, () => {
    logger.info({ message: `HTTP API Server listening on port ${HTTP_PORT}` });
  });

  // Start MCP Server over stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info({ message: "MCP Server running on stdio" });
}

main().catch((err) => {
  logger.error({ message: "Fatal error", error: err.message });
  process.exit(1);
});
