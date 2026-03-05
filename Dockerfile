# Stage 1: Build client
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npx vite build

# Stage 2: Production server
FROM node:22-alpine
WORKDIR /app

# Install server dependencies
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# Copy server source
COPY server/src/ ./server/src/

# Copy built client
COPY --from=client-build /app/client/dist ./client/dist

# Create upload, tmp, and data directories (outside webroot)
RUN mkdir -p /app/server/uploads /app/server/tmp /app/data

# Non-root user for security
RUN addgroup -g 1001 -S loominade && \
    adduser -S loominade -u 1001 -G loominade && \
    chown -R loominade:loominade /app
USER loominade

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1

CMD ["node", "server/src/index.js"]
