FROM node:20-alpine AS base
WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm ci --workspace=shared --workspace=server --ignore-scripts

# Copy source
COPY shared/ ./shared/
COPY server/ ./server/

# Generate Prisma client
RUN npx prisma generate --schema=server/prisma/schema.prisma

WORKDIR /app/server
ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "src/index.js"]
