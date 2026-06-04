# Debian slim (glibc) : better-sqlite3 a un binaire précompilé → pas de toolchain à installer.
# (node:20-alpine échouerait : pas de prebuild musl pour better-sqlite3.)
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
COPY --from=builder /app .

# La base SQLite (leads, catalogue) vit dans /app/data.
# NB : ne PAS déclarer VOLUME ici — Railway rejette les Dockerfiles avec VOLUME.
# La persistance se fait en attachant un Railway Volume (dashboard) monté sur /app/data.
ENV PORT=3001
EXPOSE 3001
CMD ["npx", "tsx", "src/server/index.ts"]
