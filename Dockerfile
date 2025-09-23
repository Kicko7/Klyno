# Use Nixpacks to build the application
FROM nixpacks/nixpacks:latest

# Set working directory
WORKDIR /app

# Copy the application files
COPY . .

# Nixpacks will handle the build process
# The nixpacks.toml file will be used for configuration
