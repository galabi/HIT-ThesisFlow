FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm ci --workspace=shared --workspace=client --ignore-scripts

COPY shared/ ./shared/
COPY client/ ./client/

RUN npm run build -w client

# ── Serve with Nginx ──────────────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
