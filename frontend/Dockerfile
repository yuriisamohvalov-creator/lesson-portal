FROM node:22-slim AS development
RUN apt-get update -y && apt-get install -y wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json next.config.js ./
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]

FROM node:22-slim AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_MAX_VIDEO_SIZE_MB=5000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_MAX_VIDEO_SIZE_MB=$NEXT_PUBLIC_MAX_VIDEO_SIZE_MB
# Playwright is a devDependency for e2e; never download browsers in image builds.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NODE_OPTIONS=--max-old-space-size=2048
# Prod hosts (brix) do not run Verdaccio; never inherit CI npm_config_registry.
ENV npm_config_registry=https://registry.npmjs.org/
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN mkdir -p public
RUN npm run build

FROM node:22-slim AS runner
RUN apt-get update -y && apt-get install -y wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
