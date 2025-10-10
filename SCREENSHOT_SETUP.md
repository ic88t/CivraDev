# Screenshot Capture Setup Guide

This guide explains how to set up automatic screenshot capture for generated projects.

## Overview

When a project is generated, the system automatically:
1. Waits for the dev server to be ready
2. Captures a screenshot using Puppeteer
3. Uploads it to Supabase Storage
4. Displays it in the "My Projects" gallery view

## Setup Steps

### 1. Install Puppeteer

```bash
npm install puppeteer
```

**Note**: Puppeteer will download Chromium (~170MB) during installation. For production, consider using `puppeteer-core` with a separate Chromium installation.

### 2. Set up Supabase Storage

**Option A: One-Step SQL (Easiest)** ⭐

1. Open Supabase Dashboard → **SQL Editor**
2. Copy and paste **ALL** contents of `setup-storage-policies.sql`
3. Click **Run** (Cmd/Ctrl + Enter)
4. Check the verification output at the bottom

This single SQL script does everything:
- Creates the `project-screenshots` bucket (public)
- Adds all 4 storage policies
- Adds `screenshot_url` column to projects table
- Creates necessary indexes

**Option B: Manual Dashboard Setup**

If SQL gives permission errors, follow `STORAGE_SETUP_GUIDE.md` or `POLICIES_STEP_BY_STEP.md`:
1. Run `setup-screenshot-storage.sql` (just the column)
2. Create bucket via Dashboard UI
3. Add 4 policies via Dashboard UI

### 3. Verify Storage Bucket

In Supabase Dashboard:
1. Go to **Storage** → **Buckets**
2. You should see `project-screenshots` bucket
3. Make sure it's set to **Public**
4. Click on the bucket → **Policies** → Should show 4 policies

### 4. Add Environment Variable (Optional)

For production deployments, add to your `.env.local`:

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

This ensures screenshot capture uses the correct URL in production.

## How It Works

### Automatic Capture Flow

1. **Generation Complete**: After `npm run dev` is ready
2. **API Trigger**: `app/api/generate-daytona/route.ts` calls screenshot API
3. **Puppeteer Launch**: Headless browser navigates to preview URL
4. **Screenshot**: Captures 1280x720 PNG image
5. **Upload**: Saves to Supabase Storage at `{userId}/{projectId}-{timestamp}.png`
6. **Database Update**: Updates project record with `screenshot_url`
7. **Gallery Display**: Screenshot appears in "My Projects" tab

### Manual Capture

You can also manually trigger screenshot capture:

```bash
POST /api/projects/{projectId}/screenshot
Authorization: Bearer {token}
```

### File Organization

Screenshots are organized by user ID:
```
project-screenshots/
├── {user-id-1}/
│   ├── {project-id-1}-1234567890.png
│   └── {project-id-2}-1234567891.png
└── {user-id-2}/
    └── {project-id-3}-1234567892.png
```

## Gallery Display

The "My Projects" tab (`app/page.tsx`) automatically displays screenshots:

- **With Screenshot**: Shows project preview image with hover effects
- **Without Screenshot**: Shows placeholder with project icon
- **Click to Open**: Opens the full project page

### Screenshot Features

- ✅ Automatic capture after generation
- ✅ User-based folder structure
- ✅ Old screenshots auto-deleted when re-captured
- ✅ Public CDN access via Supabase
- ✅ Responsive grid layout with hover effects
- ✅ Fallback to icon if screenshot unavailable

## Troubleshooting

### Screenshots Not Appearing

1. **Check Puppeteer Installation**:
   ```bash
   npm list puppeteer
   ```

2. **Check Storage Bucket**:
   - Verify bucket exists and is public
   - Check RLS policies are correct

3. **Check Logs**:
   ```bash
   # Look for screenshot capture logs
   [API] Triggering screenshot capture for project...
   [SCREENSHOT] Successfully captured and saved screenshot...
   ```

4. **Check Database**:
   ```sql
   SELECT id, name, screenshot_url FROM projects;
   ```

### Permission Errors

If you get "Permission denied" errors:

```sql
-- Re-run the storage policies from setup-screenshot-storage.sql
-- Or check if user ID matches the folder structure
```

### Puppeteer Fails on Server

For deployment (Vercel, etc.), you may need to:

1. Use external screenshot service (e.g., Puppeteer as a service)
2. Or use serverless-compatible solution like `@sparticuz/chromium`

Example with serverless Chromium:

```bash
npm install @sparticuz/chromium
```

```typescript
import chromium from '@sparticuz/chromium';

const browser = await puppeteer.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath(),
  headless: chromium.headless,
});
```

## Performance Notes

- Screenshot capture runs in **background** (non-blocking)
- Generation completes immediately, screenshot happens async
- Typical capture time: 2-5 seconds
- Screenshots cached with 1-hour CDN cache

## API Reference

### POST /api/projects/[projectId]/screenshot

**Request**:
```json
{
  // No body required
}
```

**Response**:
```json
{
  "success": true,
  "screenshot_url": "https://xxx.supabase.co/storage/v1/object/public/project-screenshots/..."
}
```

**Errors**:
- `401`: Not authenticated
- `403`: Not project owner
- `404`: Project not found
- `400`: No preview URL available
- `500`: Screenshot capture failed

## Storage Costs

Supabase Storage pricing (approximate):
- Storage: $0.021/GB/month
- Bandwidth: $0.09/GB

Example: 1000 screenshots × 500KB = ~$0.01/month

## Next Steps

After setup:
1. Generate a new project to test screenshot capture
2. Check "My Projects" tab for gallery view
3. Verify screenshot appears within ~5 seconds
4. Test manual screenshot API if needed

For production, consider:
- Setting up CDN cache headers
- Implementing screenshot retry logic
- Adding screenshot regeneration button in UI
