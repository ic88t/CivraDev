# Building and Using the Pre-configured Civra Vite Image

## Step 1: Build the Docker Image

```bash
cd /home/ic3it/lovable-clone/lovable-ui

# Build the Vite image
docker build -f docker/civra-vite.Dockerfile -t iceonice/civra-vite:latest .

# Push to Docker Hub (or your registry)
docker push iceonice/civra-vite:latest
```

## Step 2: The Code is Already Configured

The image is already configured in `scripts/generate-with-civra.ts` to use:
```typescript
image: "iceonice/civra-vite:latest"
```

With automatic fallback to `node:20` if the image doesn't exist.

## Step 3: Test the Image Locally (Optional)

```bash
# Run container
docker run -it --rm iceonice/civra-vite:latest bash

# Inside container, verify installations:
node --version          # Should show v20.x
pnpm --version         # Should show latest pnpm
npm list -g            # Should show @anthropic-ai/claude-code
ls node_modules        # Should show pre-installed Vite packages
```

## Expected Performance Improvements

- **Before (Next.js)**: 60-90 seconds per generation
- **After (Vite)**: 10-25 seconds per generation
- **Improvement**: 60-80% faster! 🚀⚡

## What's Pre-installed

✅ Node.js 20
✅ pnpm (faster than npm)
✅ All common Vite + React dependencies (vite, react, tailwindcss, etc.)
✅ Claude Code SDK
✅ TypeScript & TSX
✅ Optimized cache directories

## Performance Benefits of Vite over Next.js

1. **Instant HMR**: Vite uses native ES modules for near-instant updates
2. **Faster Dev Server**: Starts in 1-3 seconds vs Next.js 5-10 seconds
3. **Lighter Weight**: No server-side rendering overhead
4. **Faster Builds**: Uses esbuild for production builds

## Updating the Image

When you want to add more pre-installed packages:

1. Edit `docker/base-vite-package.json`
2. Rebuild: `docker build -f docker/civra-vite.Dockerfile -t iceonice/civra-vite:latest .`
3. Push to registry: `docker push iceonice/civra-vite:latest`
4. New generations will use updated image automatically

## Registry Options

### Docker Hub (Recommended)
```bash
docker login
docker push iceonice/civra-vite:latest
```

### Private Registry
Update the image name in `scripts/generate-with-civra.ts` line 176:
```typescript
image: "your-registry.com/civra-vite:latest"
```
