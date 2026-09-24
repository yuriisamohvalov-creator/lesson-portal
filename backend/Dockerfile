FROM node:22-slim AS development
RUN apt-get update -y && apt-get install -y openssl wget ffmpeg && rm -rf /var/lib/apt/lists/*
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
RUN apt-get update -y && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ARG NPM_REGISTRY=https://registry.npmjs.org/
ENV npm_config_registry=$NPM_REGISTRY
ENV NODE_OPTIONS="--max-old-space-size=2048 --dns-result-order=ipv4first"
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1
ENV PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x
ENV PRISMA_ENGINES_CHECKSUM_IGNORE=1
COPY package*.json ./
# ignore-scripts avoids hung @prisma/engines postinstall; rebuild natives + generate explicitly
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --ignore-scripts \
    && npm rebuild argon2 \
    && npm install --no-save --no-audit --no-fund prisma@5.22.0
COPY . .
# Preseed query/schema engines from host CI cache (CDN downloads hang in this network)
RUN mkdir -p node_modules/@prisma/engines node_modules/prisma/node_modules/@prisma/engines \
    && cp -a .ci-prisma-engines/. node_modules/@prisma/engines/ \
    && cp -a .ci-prisma-engines/. node_modules/prisma/node_modules/@prisma/engines/ \
    && cp -a .ci-prisma-engines/libquery_engine-debian-openssl-3.0.x.so.node node_modules/prisma/ \
    && cp -a .ci-prisma-engines/*.sha256 node_modules/prisma/node_modules/@prisma/engines/ 2>/dev/null || true \
    && PRISMA_ENGINES_CHECKSUM_IGNORE=1 npx prisma generate
RUN npm run build

FROM node:22-slim AS runner
RUN apt-get update -y && apt-get install -y openssl wget ffmpeg python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ARG NPM_REGISTRY=https://registry.npmjs.org/
ENV npm_config_registry=$NPM_REGISTRY
ENV NODE_OPTIONS="--max-old-space-size=2048 --dns-result-order=ipv4first"
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1
ENV PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x
ENV PRISMA_ENGINES_CHECKSUM_IGNORE=1
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY .ci-prisma-engines ./.ci-prisma-engines
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --no-audit --no-fund --ignore-scripts \
    && npm rebuild argon2 \
    && npm install --no-save --no-audit --no-fund prisma dotenv \
    && mkdir -p node_modules/@prisma/engines node_modules/prisma/node_modules/@prisma/engines \
    && cp -a .ci-prisma-engines/. node_modules/@prisma/engines/ \
    && cp -a .ci-prisma-engines/. node_modules/prisma/node_modules/@prisma/engines/ \
    && cp -a .ci-prisma-engines/libquery_engine-debian-openssl-3.0.x.so.node node_modules/prisma/ \
    && cp -a .ci-prisma-engines/*.sha256 node_modules/prisma/node_modules/@prisma/engines/ 2>/dev/null || true \
    && PRISMA_ENGINES_CHECKSUM_IGNORE=1 npx prisma generate \
    && rm -rf .ci-prisma-engines
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
