# Use Node.js 22 Alpine as base image
FROM node:22-alpine

# Install pnpm globally
RUN npm install -g pnpm@9.15.0

# Set working directory
WORKDIR /app

# Copy all files first
COPY . .

# Install dependencies
RUN pnpm install

# Build the application
RUN pnpm run build

# Expose port
EXPOSE 3001

# Start the application
CMD ["pnpm", "start"]
