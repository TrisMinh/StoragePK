FROM node:22-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY tools ./tools
RUN npm ci
RUN npm run build:web
RUN npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/package.json /repo/package-lock.json ./
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/web/package.json ./apps/web/package.json
COPY --from=build /repo/apps/web/.next ./apps/web/.next
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace=@storagepk/web"]
