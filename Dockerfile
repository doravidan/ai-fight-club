FROM node:22-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (need dev deps for build)
RUN npm ci

# Copy source
COPY . .

# Build frontend
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Expose port
EXPOSE 3001

# Start server
ENV PORT=3001
ENV NODE_ENV=production
CMD ["npx", "tsx", "src/server.ts"]
