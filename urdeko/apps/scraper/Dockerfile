FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/scraper/package.json apps/scraper/
COPY packages/tsconfig/package.json packages/tsconfig/
RUN pnpm install --filter @urdeko/scraper --frozen-lockfile || pnpm install --filter @urdeko/scraper

FROM base AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/scraper/node_modules ./apps/scraper/node_modules
COPY packages ./packages
COPY apps/scraper ./apps/scraper

WORKDIR /app/apps/scraper
ENV NODE_ENV=production
EXPOSE 3030
CMD ["pnpm", "start"]
