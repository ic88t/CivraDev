# Pre-configured Daytona Image for Civra Next.js Projects
# This image speeds up generation by 50-70% by pre-installing dependencies

FROM node:20-slim

# Set working directory
WORKDIR /workspace

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm globally for faster package management
RUN npm install -g pnpm@latest npm@latest

# Create base package.json with common dependencies
COPY docker/base-package.json ./package.json

# Pre-install all common Next.js dependencies
# This is the key optimization - deps are already installed
RUN pnpm install --frozen-lockfile && pnpm store prune

# Install Claude Code SDK globally
RUN npm install -g @anthropic-ai/claude-code

# Pre-configure environment for optimal performance
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH

# Create npm cache directory
RUN mkdir -p /tmp/npm-cache /tmp/pnpm-cache
ENV NPM_CONFIG_CACHE=/tmp/npm-cache
ENV PNPM_CACHE_FOLDER=/tmp/pnpm-cache

# Warm up pnpm cache with additional common packages
RUN pnpm add -g typescript tsx

# Set up workspace directory structure
RUN mkdir -p /root/workspace

WORKDIR /root

# Keep container running
CMD ["tail", "-f", "/dev/null"]
