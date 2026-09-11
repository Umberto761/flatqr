FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=8080
ENV BETA_ACCESS=flatqr-beta
RUN mkdir -p /app/data /app/scripts && chown node:node /app/data
USER node
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/data/demo-harvest.csv ./data/demo-harvest.csv
COPY --from=builder --chown=node:node /app/scripts/start.cjs ./scripts/start.cjs
EXPOSE 8080
CMD ["node", "scripts/start.cjs"]
