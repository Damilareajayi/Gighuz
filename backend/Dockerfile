FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Invoked via `node` directly rather than `npm run build` (-> tsc) — on some
# Cloud Build environments the installed node_modules/.bin/tsc loses its
# executable bit, failing with "Permission denied" even right after a clean
# `npm ci`. Running it as a node script sidesteps the OS exec() bit entirely.
RUN node node_modules/typescript/bin/tsc
RUN npm prune --omit=dev
EXPOSE 8080
CMD ["node", "dist/index.js"]
