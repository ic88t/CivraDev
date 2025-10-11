# Civra Docker Images

This directory contains Docker configurations for pre-configured Daytona images that speed up project generation by **60-80%**.

## 🚀 Quick Start - Vite Image (Recommended)

```bash
# Option 1: Build and push in one command
./docker/build-and-push-vite.sh iceonice

# Option 2: Build only (test locally first)
docker build -f docker/civra-vite.Dockerfile -t civra-vite:latest .

# Option 3: Build, then push separately
docker build -f docker/civra-vite.Dockerfile -t civra-vite:latest .
./docker/push-vite-to-registry.sh iceonice
```

## 📦 Available Images

### 1. **civra-vite** (Current - Recommended)
- **Framework**: Vite + React 18
- **Port**: 5173
- **Speed**: 10-25 seconds per generation
- **HMR**: Instant (native ES modules)
- **File**: `civra-vite.Dockerfile`
- **Packages**: `base-vite-package.json`

### 2. **civra-nextjs** (Legacy)
- **Framework**: Next.js 15 (App Router)
- **Port**: 3000
- **Speed**: 60-90 seconds per generation
- **File**: `civra-nextjs.Dockerfile`
- **Packages**: `base-package.json`

## 🎯 How It Works

The code automatically tries to use the pre-configured image:
```typescript
// scripts/generate-with-civra.ts
image: "iceonice/civra-vite:latest"
```

**Fallback**: If the image doesn't exist, it falls back to `node:20` and installs pnpm.

## 📊 Performance Comparison

| Image | Startup Time | HMR Speed | Generation Time | Framework |
|-------|-------------|-----------|----------------|-----------|
| **civra-vite** | ~2s | Instant | 10-25s | Vite + React |
| civra-nextjs | ~8s | ~500ms | 60-90s | Next.js 15 |
| node:20 (fallback) | ~15s | N/A | 90-120s | - |

## 🔧 Building the Vite Image

### Manual Build
```bash
cd /home/ic3it/lovable-clone/lovable-ui
docker build -f docker/civra-vite.Dockerfile -t civra-vite:latest .
```

### Test Locally
```bash
docker run -it --rm civra-vite:latest bash
# Inside container:
node --version          # v20.x
pnpm --version         # latest
ls node_modules        # Vite, React, etc.
```

### Push to Docker Hub
```bash
# Login first (if not already)
docker login

# Push using the script
./docker/push-vite-to-registry.sh iceonice

# Or manually
docker tag civra-vite:latest iceonice/civra-vite:latest
docker push iceonice/civra-vite:latest
```

## 📝 Customizing Pre-installed Packages

1. Edit `docker/base-vite-package.json`
2. Add/remove dependencies
3. Rebuild: `./docker/build-and-push-vite.sh iceonice`

## 🔍 What's Pre-installed

### System Packages
- Node.js 20 (slim)
- pnpm (faster than npm)
- git, curl
- TypeScript, tsx

### Vite Dependencies
- vite@^6.0.0
- react@^18.3.1
- react-dom@^18.3.1
- @vitejs/plugin-react@^4.3.0
- typescript@^5.6.0
- tailwindcss@^3.4.0
- All supporting packages

### Global Tools
- @anthropic-ai/claude-code (Claude Code SDK)
- pnpm (package manager)
- typescript, tsx

## 🌐 Using Custom Registry

If not using Docker Hub:

1. Update `scripts/generate-with-civra.ts` line 176:
```typescript
image: "your-registry.com/civra-vite:latest"
```

2. Push to your registry:
```bash
./docker/push-vite-to-registry.sh your-registry.com/civra-vite
```

## 📚 Documentation

- **Vite Setup**: `BUILD_VITE_INSTRUCTIONS.md`
- **Next.js Setup**: `BUILD_INSTRUCTIONS.md` (legacy)
- **Registry Config**: `REGISTRY_SETUP.md`

## 🎉 Benefits

✅ **60-80% faster** project generation
✅ **Instant HMR** with Vite
✅ **Pre-cached** dependencies
✅ **Optimized** build times
✅ **Consistent** development environment
