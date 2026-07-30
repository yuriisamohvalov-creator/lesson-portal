FROM node:22-slim AS development
RUN apt-get update -y && apt-get install -y openssl wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig*.json nest-cli.json ./
COPY . .
EXPOSE 3001 9229
CMD ["sh", "-c", "npx prisma generate && npm run start:dev"]

# debian slim so runtime matches binaryTargets debian-openssl-3.0.x
FROM node:22-slim AS builder
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_OPTIONS=--max-old-space-size=2048
ARG NPM_REGISTRY=https://registry.npmjs.org/
ENV npm_config_registry=$NPM_REGISTRY
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-slim AS runner
RUN apt-get update -y && apt-get install -y openssl wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ARG NPM_REGISTRY=https://registry.npmjs.org/
ENV npm_config_registry=$NPM_REGISTRY
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci --omit=dev --no-audit --no-fund \
    && npm install --no-save prisma dotenv \
    && npx prisma generate
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
