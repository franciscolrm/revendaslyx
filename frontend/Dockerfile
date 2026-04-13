# ── Stage 1: Build ──
FROM node:20-alpine AS builder

WORKDIR /app

# Cache de dependências
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY . .

# NEXT_PUBLIC_* são injetadas em build-time no JS do client.
# Para o rewrite funcionar em runtime, o server.js lê process.env em runtime.
# Usamos um placeholder no build e sobrescrevemos via ENV no container.
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_SUPABASE_URL=https://supabase-revendas.lyxai.com.br

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL

RUN npm run build

# Garante que public/ exista para o COPY do stage 2
RUN mkdir -p /app/public

# ── Stage 2: Production ──
FROM node:20-alpine

WORKDIR /app

# Copia output standalone do Next.js
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Usuário não-root
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
USER appuser

EXPOSE 3000

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

CMD ["node", "server.js"]
