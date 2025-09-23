# Use Node.js 22 Alpine as base image
FROM node:22-alpine

# Install pnpm globally
RUN npm install -g pnpm@9.15.0

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (without frozen lockfile since there's no pnpm-lock.yaml)
RUN pnpm install

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Expose port
EXPOSE 3001

# Start the application
CMD ["pnpm", "start"]
