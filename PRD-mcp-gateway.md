# PRODUCT REQUIREMENT DOCUMENT (PRD) - MCP GATEWAY & SANDBOX

## 1. OBJETIVO DEL SISTEMA
Construir una plataforma Full Stack segura y aislada bajo un monorepo que exponga un servidor Model Context Protocol (MCP) para ejecutar colecciones de Postman y código arbitrario en entornos Docker controlados, administrable desde una interfaz web en tiempo real.

## 2. ARQUITECTURA DE SOFTWARE Y FLUJO DE DATOS
El sistema se divide en dos aplicaciones desacopladas (/apps):
- **mcp-server (Backend):** Servidor Node.js/TypeScript que implementa el protocolo MCP oficial sobre transporte stdio y expone APIs REST secundarias para el frontend. Interactúa con el socket de Docker (/var/run/docker.sock) mediante Dockerode.
- **client-dashboard (Frontend):** Aplicación Next.js 14 (App Router) que consume el estado del servidor y renderiza la consola.

[LLM / Cliente MCP] <---> [stdio] <---> [MCP Server (Backend)] <---> [Docker Engine API]
^
| [HTTP / SSE]
v
[Next.js Dashboard]


## 3. ESPECIFICACIÓN DE HERRAMIENTAS MCP (TOOLS)

### Herramienta 1: `execute_sandbox_code`
- **Descripción:** Ejecuta código TypeScript/JavaScript o Python de forma segura dentro de un contenedor aislado.
- **Parámetros de Entrada (JSON Schema):**
  - `language`: string (enum: ["javascript", "typescript", "python"])
  - `code`: string (código fuente limpio)
- **Reglas de Negocio y Seguridad:**
  - **Aislamiento:** Debe instanciar imágenes oficiales ligeras (`node:alpine` o `python:alpine`).
  - **Restricción de Red:** Contenedor iniciado con `--network none`.
  - **Límite de Recursos:** Máximo 50MB de RAM y CPU compartido.
  - **Timeout:** Destrucción forzada del contenedor (`docker kill`) si la ejecución supera los 5 segundos.
  - **Retorno:** Objeto JSON con `{ stdout: string, stderr: string, exitCode: number }`.

### Herramienta 2: `run_postman_collection`
- **Descripción:** Ejecuta pruebas de integración automatizadas basadas en colecciones de Postman.
- **Parámetros de Entrada:**
  - `collectionUrl`: string (URL pública de la colección o JSON stringificado).
- **Flujo:** Descarga/parsea la colección, ejecuta las peticiones secuencialmente y mapea los assertions en un reporte estructurado de éxito/fallo.

## 4. REQUERIMIENTOS DEL FRONTEND (/apps/frontend)
- **Terminal UI:** Interfaz oscura (estilo xterm.js) que pinte las respuestas del sandbox respetando saltos de línea y formateo monoespaciado.
- **Métricas de Postman:** Dashboard con gráficos o tarjetas limpias de tipo semáforo (Verde: Pasó, Rojo: Falló) indicando códigos de respuesta HTTP y tiempos de latencia.

## 5. REQUERIMIENTOS NO FUNCIONALES Y CALIDAD
- **Tipado:** TypeScript estricto (`noImplicitAny: true`).
- **Logs:** Implementar un Logger estructurado en JSON para capturar los ciclos de vida de los contenedores Docker.
- **Resiliencia:** Manejo de excepciones para capturar fallos de sintaxis en el código del sandbox sin tumbar el proceso del servidor principal.
