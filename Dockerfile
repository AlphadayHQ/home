FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json yarn.lock ./
RUN corepack enable \
    && corepack prepare yarn@1.22.22 --activate \
    && yarn install --frozen-lockfile

COPY . .

ARG API_BASE_URL=https://api.alphaday.com
ENV API_BASE_URL=$API_BASE_URL

RUN yarn build

FROM build AS test

CMD ["yarn", "test"]

FROM build AS production-deps

RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    NODE_OPTIONS=--max-old-space-size=320 \
    PORT=3000

WORKDIR /app

COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=production-deps --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server.mjs ./server.mjs

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/robots.txt').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "server.mjs"]
