# Multi-stage build for PR Approval Finder
# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci --only=production && \
    cd client && npm ci --only=production && \
    cd ../server && npm ci --only=production

# Copy source code
COPY . .

# Build client
RUN cd client && npm run build

# Production stage
FROM node:18-alpine AS production

# Add non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/client/build ./client/build
COPY --from=builder --chown=nextjs:nodejs /app/server ./server
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Create necessary directories
RUN mkdir -p /app/logs && chown -R nextjs:nodejs /app/logs

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "server/index.js"]

# Labels for better maintainability
LABEL maintainer="Aswin <your.email@example.com>"
LABEL version="6.0.0"
LABEL description="PR Approval Finder - GitHub Pull Request Analysis Tool"
LABEL org.opencontainers.image.source="https://github.com/yourusername/pr-approval-finder"
LABEL org.opencontainers.image.documentation="https://github.com/yourusername/pr-approval-finder#readme"
LABEL org.opencontainers.image.licenses="MIT" 