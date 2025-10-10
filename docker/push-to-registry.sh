#!/bin/bash

# Script to push civra-nextjs image to a container registry
# Usage: ./push-to-registry.sh [registry-url]

set -e

REGISTRY_URL="${1:-}"
IMAGE_NAME="civra-nextjs:latest"

echo "🚀 Pushing civra-nextjs image to registry..."
echo ""

if [ -z "$REGISTRY_URL" ]; then
    echo "📝 No registry URL provided. Options:"
    echo ""
    echo "1. Docker Hub (Public - Free)"
    echo "   Usage: ./push-to-registry.sh YOUR_DOCKERHUB_USERNAME"
    echo "   Example: ./push-to-registry.sh johndoe"
    echo ""
    echo "2. Custom Registry (Daytona/Private)"
    echo "   Usage: ./push-to-registry.sh REGISTRY_URL/IMAGE_NAME"
    echo "   Example: ./push-to-registry.sh registry.daytona.io/civra-nextjs"
    echo ""
    exit 1
fi

# Check if image exists locally
if ! docker images | grep -q "civra-nextjs"; then
    echo "❌ Error: civra-nextjs:latest image not found locally"
    echo "Please build it first:"
    echo "  docker build -f docker/civra-nextjs.Dockerfile -t civra-nextjs:latest ."
    exit 1
fi

# Check if registry URL contains a slash (custom registry) or not (Docker Hub)
if [[ "$REGISTRY_URL" == *"/"* ]]; then
    # Custom registry with full path
    FULL_IMAGE_PATH="$REGISTRY_URL:latest"
else
    # Docker Hub username
    FULL_IMAGE_PATH="$REGISTRY_URL/civra-nextjs:latest"
fi

echo "📦 Tagging image..."
docker tag $IMAGE_NAME $FULL_IMAGE_PATH

echo "⬆️  Pushing to registry..."
docker push $FULL_IMAGE_PATH

echo ""
echo "✅ Successfully pushed image to: $FULL_IMAGE_PATH"
echo ""
echo "📝 Next step: Update scripts/generate-with-civra.ts"
echo "   Change line 180 to:"
echo "   image: \"$FULL_IMAGE_PATH\","
echo ""
echo "🎉 Done!"
