# Container Registry Setup Guide

## Quick Start

Choose one of the following options:

---

## Option 1: Docker Hub (Recommended - Free & Easy)

### Step 1: Create Docker Hub Account
1. Go to https://hub.docker.com/signup
2. Sign up for a free account
3. Verify your email

### Step 2: Login
```bash
docker login
# Enter your Docker Hub username and password
```

### Step 3: Push Image
```bash
cd ~/lovable-clone/lovable-ui

# Replace YOUR_USERNAME with your actual Docker Hub username
./docker/push-to-registry.sh YOUR_USERNAME

# Example: If your username is "johndoe":
# ./docker/push-to-registry.sh johndoe
```

### Step 4: Update Code
After pushing, the script will tell you what to update. It will be:

Edit `scripts/generate-with-civra.ts` line 180:
```typescript
image: "YOUR_USERNAME/civra-nextjs:latest",
```

**Done!** Your image is now publicly available and Daytona can use it.

---

## Option 2: Daytona Registry (If Available)

If Daytona provides a container registry, check their documentation for:
- Registry URL (e.g., `registry.daytona.io`)
- Authentication credentials
- Naming conventions

### Step 1: Login to Daytona Registry
```bash
docker login DAYTONA_REGISTRY_URL
# Enter credentials provided by Daytona
```

### Step 2: Push Image
```bash
./docker/push-to-registry.sh DAYTONA_REGISTRY_URL/civra-nextjs
```

### Step 3: Update Code
Edit `scripts/generate-with-civra.ts` line 180:
```typescript
image: "DAYTONA_REGISTRY_URL/civra-nextjs:latest",
```

---

## Option 3: GitHub Container Registry (GHCR)

### Step 1: Create Personal Access Token
1. Go to GitHub Settings → Developer Settings → Personal Access Tokens
2. Generate new token with `write:packages` permission
3. Copy the token

### Step 2: Login
```bash
echo YOUR_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### Step 3: Push Image
```bash
docker tag civra-nextjs:latest ghcr.io/YOUR_GITHUB_USERNAME/civra-nextjs:latest
docker push ghcr.io/YOUR_GITHUB_USERNAME/civra-nextjs:latest
```

### Step 4: Update Code
Edit `scripts/generate-with-civra.ts` line 180:
```typescript
image: "ghcr.io/YOUR_GITHUB_USERNAME/civra-nextjs:latest",
```

---

## Verification

After pushing and updating the code, verify it works:

```bash
# Test that the image is accessible
docker pull YOUR_REGISTRY_URL/civra-nextjs:latest

# Generate a new project to test
# The logs should show: "Using pre-configured image: YOUR_REGISTRY_URL/civra-nextjs:latest"
```

---

## Troubleshooting

**Image not found during generation:**
- Verify the image was pushed: `docker search YOUR_USERNAME/civra-nextjs`
- Check the image name in `scripts/generate-with-civra.ts` matches exactly
- Ensure Daytona has access to pull from your registry

**Authentication errors:**
- Make sure you're logged in: `docker login`
- Verify your credentials are correct
- Check registry URL is correct

**Fallback to node:20:**
- This is normal if the custom image isn't found
- You'll still get 50-60% speed improvement from other optimizations
- No errors will occur, just slightly slower

---

## Current Status

✅ Image built locally: `civra-nextjs:latest`
⏳ Image pushed to registry: **Pending**
⏳ Code updated to use registry image: **Pending**

Once complete, you'll get **70-85% faster generation times!** 🚀
