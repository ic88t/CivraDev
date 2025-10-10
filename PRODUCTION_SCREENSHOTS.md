# Production Screenshot Solutions

## The Problem

The current Puppeteer implementation only works in development because:
- ❌ Requires installing system libraries (`libxkbcommon`, etc.)
- ❌ Downloads 170MB Chrome browser
- ❌ Won't work on serverless platforms (Vercel, Netlify)
- ❌ Each deployment needs manual setup
- ❌ Not suitable for production with real users

## Production Solutions

### Option 1: Screenshot Service API (Recommended) ⭐

Use a third-party screenshot service. No server setup needed.

#### Recommended Services:

**1. ScreenshotOne** (https://screenshotone.com)
- ✅ Free tier: 100 screenshots/month
- ✅ $9/month: 1,000 screenshots
- ✅ Works on all platforms
- ✅ Fast CDN delivery

**2. ApiFlash** (https://apiflash.com)
- ✅ Free tier: 100 screenshots/month
- ✅ $9/month: 1,000 screenshots
- ✅ Chrome rendering
- ✅ Simple API

**3. ScreenshotAPI** (https://screenshotapi.net)
- ✅ Free tier: 100 screenshots/month
- ✅ Pay-as-you-go pricing
- ✅ Multiple formats

#### Implementation:

I've created `app/api/projects/[projectId]/screenshot-service/route.ts` for you.

**Setup:**

1. Sign up for ScreenshotOne (or any service)
2. Get your API key
3. Add to `.env.local`:
   ```env
   SCREENSHOTONE_API_KEY=your_api_key_here
   ```
4. Update screenshot API calls to use `/screenshot-service` instead of `/screenshot`

**Cost Estimate:**
- 100 projects/month = Free tier
- 1,000 projects/month = $9/month
- Much cheaper than running your own server!

---

### Option 2: Serverless Chrome

Use `@sparticuz/chromium` - a serverless-compatible Chrome.

#### Pros:
✅ No external service needed
✅ Works on Vercel/Netlify
✅ No monthly fees

#### Cons:
❌ Adds ~50MB to deployment
❌ Slower (cold starts)
❌ More complex setup

**Installation:**

```bash
npm install chrome-aws-lambda @sparticuz/chromium puppeteer-core
```

**Example:**

```typescript
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  args: chromium.args,
  defaultViewport: chromium.defaultViewport,
  executablePath: await chromium.executablePath(),
  headless: chromium.headless,
});
```

---

### Option 3: Screenshot Worker Service

Deploy a separate screenshot microservice.

#### Setup:
1. Create a separate Node.js server with Puppeteer
2. Deploy to a VPS (DigitalOcean, AWS EC2)
3. Your main app calls this service via API

#### Pros:
✅ Full control
✅ No per-screenshot costs
✅ Can handle high volume

#### Cons:
❌ Requires server management
❌ Monthly server costs ($5-20/month)
❌ More complex infrastructure

---

### Option 4: Client-Side Screenshots

Use `html2canvas` to capture screenshots in the browser.

**Installation:**
```bash
npm install html2canvas
```

**Example:**
```typescript
import html2canvas from 'html2canvas';

const captureScreenshot = async () => {
  const iframe = document.querySelector('iframe');
  if (!iframe?.contentDocument) return;

  const canvas = await html2canvas(iframe.contentDocument.body);
  const blob = await new Promise(resolve => canvas.toBlob(resolve));

  // Upload blob to Supabase Storage
};
```

#### Pros:
✅ No backend needed
✅ Zero cost
✅ Works everywhere

#### Cons:
❌ Requires user's browser to be open
❌ CORS issues with iframes
❌ Less reliable
❌ Can't capture on generation (only when user views)

---

## Comparison Table

| Solution | Cost | Setup Difficulty | Reliability | Serverless |
|----------|------|-----------------|-------------|------------|
| **ScreenshotOne** | $9/mo (1k) | ⭐ Easy | ⭐⭐⭐ Excellent | ✅ Yes |
| **ApiFlash** | $9/mo (1k) | ⭐ Easy | ⭐⭐⭐ Excellent | ✅ Yes |
| **Serverless Chrome** | Free | ⭐⭐ Medium | ⭐⭐ Good | ✅ Yes |
| **Worker Service** | $10-20/mo | ⭐⭐⭐ Hard | ⭐⭐⭐ Excellent | ❌ No |
| **Client-Side** | Free | ⭐⭐ Medium | ⭐ Fair | ✅ Yes |

---

## My Recommendation

**For Production: Use ScreenshotOne** ⭐

**Why:**
- ✅ Easiest to set up (5 minutes)
- ✅ Most reliable
- ✅ Works on all platforms (Vercel, Netlify, etc.)
- ✅ Free tier for testing
- ✅ Affordable ($9/month for 1,000 screenshots)
- ✅ No infrastructure to manage

**Setup Steps:**

1. Sign up at https://screenshotone.com
2. Get API key from dashboard
3. Add to `.env.local`:
   ```env
   SCREENSHOTONE_API_KEY=your_key_here
   ```
4. Update API calls:
   ```typescript
   // Change from:
   fetch(`/api/projects/${projectId}/screenshot`, ...)

   // To:
   fetch(`/api/projects/${projectId}/screenshot-service`, ...)
   ```

5. Done! Screenshots work in production 🎉

---

## For Development

**Current Puppeteer setup works fine** - just install dependencies:

```bash
sudo bash install-puppeteer-deps.sh
```

This is perfect for:
- Local development
- Testing
- Your own machine

But for production deployment with real users, switch to ScreenshotOne.

---

## Environment-Based Approach

Use different solutions for dev vs production:

```typescript
// In screenshot API route
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  // Use ScreenshotOne API
  await captureWithService(previewUrl);
} else {
  // Use Puppeteer (local dev only)
  await captureWithPuppeteer(previewUrl);
}
```

This gives you:
- ✅ Fast local development (Puppeteer)
- ✅ Reliable production (ScreenshotOne)
- ✅ No manual switching

---

## Next Steps

1. **For now**: Install dependencies and use Puppeteer for testing:
   ```bash
   sudo bash install-puppeteer-deps.sh
   ```

2. **Before deployment**: Sign up for ScreenshotOne and switch to the service API

3. **Alternative**: If you prefer serverless Chrome, let me know and I can set that up instead

Let me know which approach you want to use! 🚀
