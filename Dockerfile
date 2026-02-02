FROM node:22-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production
RUN npm install tsx

# Copy source
COPY . .

# Build frontend
RUN npm run build

# Expose port
EXPOSE 3000

# Start server
ENV PORT=3000
CMD ["npx", "tsx", "src/server.ts"]
