# Stage 1: Build client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npx vite build

# Stage 2: Production server
FROM node:20-alpine
WORKDIR /app

# Install server dependencies
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# Copy server source
COPY server/src/ ./server/src/

# Copy built client
COPY --from=client-build /app/client/dist ./client/dist

# Create upload and tmp directories (outside webroot)
RUN mkdir -p /app/server/uploads /app/server/tmp

# Non-root user for security
RUN addgroup -g 1001 -S knitit && \
    adduser -S knitit -u 1001 -G knitit && \
    chown -R knitit:knitit /app
USER knitit

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server/src/index.js"]
