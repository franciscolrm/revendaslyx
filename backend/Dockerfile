# ── Stage 1: Build ──
FROM node:20-alpine AS builder

WORKDIR /app

# Cache de dependências (só reinstala se package*.json mudar)
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Copia código e compila
COPY . .
RUN npm run build

# ── Stage 2: Production ──
FROM node:20-alpine

RUN apk add --no-cache wget

WORKDIR /app

# Só copia o necessário para produção
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Usuário não-root
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
USER appuser

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "dist/main.js"]
