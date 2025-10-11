#!/bin/bash

# One-command script to build and push civra-vite image
# Usage: ./build-and-push-vite.sh [your-dockerhub-username]

set -e

REGISTRY_URL="${1:-iceonice}"

echo "🏗️  Building Civra Vite Image..."
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Build the image
echo "📦 Building civra-vite:latest..."
docker build -f docker/civra-vite.Dockerfile -t civra-vite:latest .

echo ""
echo "✅ Build complete!"
echo ""

# Ask if user wants to push
read -p "🚀 Push to registry '$REGISTRY_URL'? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./docker/push-vite-to-registry.sh "$REGISTRY_URL"
else
    echo "📝 Skipping push. You can push later with:"
    echo "   ./docker/push-vite-to-registry.sh $REGISTRY_URL"
fi
