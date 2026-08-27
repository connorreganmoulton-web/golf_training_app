# Multi-stage so the shipped image doesn't carry the whole toolchain.
FROM node:20-alpine AS builder
WORKDIR /app
# Must match the runner. Without openssl here, `prisma generate` guesses
# openssl-1.1.x and emits a query engine the runner can't load.
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Prisma's engines are dynamically linked against OpenSSL.
RUN apk add --no-cache openssl
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Schema and migration history, plus enough of the Prisma CLI to apply them.
# Without this the container boots with an empty database and every route 500s.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
 && mkdir -p /app/data && chown nextjs:nodejs /app/data

# SQLite file lives on a volume so upgrading the image never eats your data.
VOLUME /app/data

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
