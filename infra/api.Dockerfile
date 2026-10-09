# Build context: repository root.
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @hm/api...
COPY packages/shared packages/shared
COPY apps/api apps/api
ENV DATABASE_URL=postgresql://build@localhost/build
RUN pnpm --filter @hm/shared build && pnpm --filter @hm/api build \
 && pnpm --filter @hm/api deploy --prod --legacy /out

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out ./
COPY --from=build /repo/apps/api/dist ./dist
USER node
EXPOSE 4000
# Applies pending migrations, then starts the API.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist/main.js"]
