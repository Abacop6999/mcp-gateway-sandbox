FROM node:22-alpine AS builder

WORKDIR /app
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY apps/backend/package.json ./apps/backend/

# Install pnpm
RUN npm install -g pnpm

COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend
RUN pnpm install --ignore-scripts
RUN pnpm build

FROM node:22-alpine

WORKDIR /app
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./
RUN npm install -g pnpm && pnpm install --prod --ignore-scripts

# Needed for communicating with Docker daemon via socket
# Note: In production, socket should be securely mapped
ENV DOCKER_HOST="unix:///var/run/docker.sock"

EXPOSE 4000
CMD ["node", "dist/index.js"]
