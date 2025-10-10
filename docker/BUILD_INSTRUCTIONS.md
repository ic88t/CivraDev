# Building and Using the Pre-configured Civra Image

## Step 1: Build the Docker Image

```bash
cd /home/ic3it/lovable-clone/lovable-ui

# Build the image
docker build -f docker/civra-nextjs.Dockerfile -t civra-nextjs:latest .

# Tag for your registry (replace with your registry URL)
docker tag civra-nextjs:latest your-registry.com/civra-nextjs:latest

# Push to your registry
docker push your-registry.com/civra-nextjs:latest
```

## Step 2: Configure Daytona to Use the Image

The image is already configured in `scripts/generate-with-civra.ts` to use:
```
image: "civra-nextjs:latest"
```

If you're using a custom registry, update line 176 in that file to:
```typescript
image: "your-registry.com/civra-nextjs:latest"
```

## Step 3: Test the Image Locally (Optional)

```bash
# Run container
docker run -it --rm civra-nextjs:latest bash

# Inside container, verify installations:
node --version          # Should show v20.x
pnpm --version         # Should show latest pnpm
npm list -g            # Should show @anthropic-ai/claude-code
ls node_modules        # Should show pre-installed packages
```

## Expected Performance Improvements

- **Before**: 60-90 seconds per generation
- **After**: 15-30 seconds per generation
- **Improvement**: 50-70% faster! 🚀

## What's Pre-installed

✅ Node.js 20
✅ pnpm (faster than npm)
✅ All common Next.js dependencies (next, react, tailwindcss, etc.)
✅ Claude Code SDK
✅ TypeScript & TSX
✅ Optimized cache directories

## Updating the Image

When you want to add more pre-installed packages:

1. Edit `docker/base-package.json`
2. Rebuild: `docker build -f docker/civra-nextjs.Dockerfile -t civra-nextjs:latest .`
3. Push to registry
4. New generations will use updated image automatically
