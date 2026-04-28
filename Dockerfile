FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY agent/package*.json ./agent/
COPY mcp-server/package*.json ./mcp-server/
COPY mcp-server-chaos/package*.json ./mcp-server-chaos/

RUN cd agent && npm ci
RUN cd mcp-server && npm ci
RUN cd mcp-server-chaos && npm ci

COPY agent ./agent
COPY mcp-server ./mcp-server
COPY mcp-server-chaos ./mcp-server-chaos

RUN cd mcp-server && npm run build && npx tsx scripts/seed.ts
RUN cd mcp-server-chaos && npm run build
RUN cd agent && npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV PORT=3000
ENV DB_PATH=/data/armoriq.db
ENV MCP_CONFIG_PATH=./mcp-config.json

COPY --from=builder /app/agent ./agent
COPY --from=builder /app/mcp-server ./mcp-server
COPY --from=builder /app/mcp-server-chaos ./mcp-server-chaos

EXPOSE 3000

WORKDIR /app/agent

CMD ["sh", "-lc", "node scripts/setup-runbooks.js && node scripts/seed-filesystem-rules.js && node dist/index.js"]
