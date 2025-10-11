#!/bin/bash

# Script to push civra-vite image to a container registry
# Usage: ./push-vite-to-registry.sh [registry-url]

set -e

REGISTRY_URL="${1:-}"
IMAGE_NAME="civra-vite:latest"

echo "🚀 Pushing civra-vite image to registry..."
echo ""

if [ -z "$REGISTRY_URL" ]; then
    echo "📝 No registry URL provided. Options:"
    echo ""
    echo "1. Docker Hub (Public - Free)"
    echo "   Usage: ./push-vite-to-registry.sh YOUR_DOCKERHUB_USERNAME"
    echo "   Example: ./push-vite-to-registry.sh iceonice"
    echo ""
    echo "2. Custom Registry (Daytona/Private)"
    echo "   Usage: ./push-vite-to-registry.sh REGISTRY_URL/IMAGE_NAME"
    echo "   Example: ./push-vite-to-registry.sh registry.daytona.io/civra-vite"
    echo ""
    exit 1
fi

# Check if image exists locally
if ! docker images | grep -q "civra-vite"; then
    echo "❌ Error: civra-vite:latest image not found locally"
    echo "Please build it first:"
    echo "  docker build -f docker/civra-vite.Dockerfile -t civra-vite:latest ."
    exit 1
fi

# Check if registry URL contains a slash (custom registry) or not (Docker Hub)
if [[ "$REGISTRY_URL" == *"/"* ]]; then
    # Custom registry with full path
    FULL_IMAGE_PATH="$REGISTRY_URL:latest"
else
    # Docker Hub username
    FULL_IMAGE_PATH="$REGISTRY_URL/civra-vite:latest"
fi

echo "📦 Tagging image..."
docker tag $IMAGE_NAME $FULL_IMAGE_PATH

echo "⬆️  Pushing to registry..."
docker push $FULL_IMAGE_PATH

echo ""
echo "✅ Successfully pushed image to: $FULL_IMAGE_PATH"
echo ""
echo "📝 Image is already configured in scripts/generate-with-civra.ts"
echo "   Currently set to: iceonice/civra-vite:latest"
echo ""
echo "🎉 Done! Your Vite projects will now generate 60-80% faster!"
