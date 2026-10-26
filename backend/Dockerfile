# Single-stage image (same tradeoff as smj-app/backend/Dockerfile): keep all deps (including
# devDependencies) and the full src/ tree so `docker compose run backend npm run migration:run` / `npm run seed`
# keep working via ts-node after deploy, without a second image/toolchain. Right call for a solo-maintained,
# single-client app at this scale.
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main"]
