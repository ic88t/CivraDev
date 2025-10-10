# Supabase Storage Setup for Screenshots

Follow these steps to set up screenshot storage via the Supabase Dashboard.

## Step 1: Run SQL Migration

1. Open your Supabase project dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste the contents of `setup-screenshot-storage.sql`
5. Click **Run** or press `Cmd/Ctrl + Enter`

This adds the `screenshot_url` column to your projects table.

## Step 2: Create Storage Bucket

1. Go to **Storage** in the left sidebar
2. Click **Create a new bucket**
3. Fill in the details:
   - **Name**: `project-screenshots`
   - **Public bucket**: Toggle **ON** (this is important!)
   - **File size limit**: 50 MB (default is fine)
   - **Allowed MIME types**: Leave empty (allows all)
4. Click **Create bucket**

## Step 3: Configure Storage Policies

Now we need to set up access policies for the bucket.

### Option A: Using the Dashboard (Recommended)

1. Click on the `project-screenshots` bucket
2. Go to the **Policies** tab
3. Click **New Policy**

**Policy 1: Allow Authenticated Users to Upload**

- Template: Create a custom policy
- Name: `Users can upload screenshots`
- Target roles: `authenticated`
- Policy command: `INSERT`
- USING expression: Leave empty
- WITH CHECK expression:
```sql
(bucket_id = 'project-screenshots'::text) AND
((storage.foldername(name))[1] = (auth.uid())::text)
```
- Click **Review** → **Save policy**

**Policy 2: Allow Public Read Access**

- Click **New Policy** again
- Name: `Public can read screenshots`
- Target roles: `public`
- Policy command: `SELECT`
- USING expression:
```sql
bucket_id = 'project-screenshots'::text
```
- WITH CHECK expression: Leave empty
- Click **Review** → **Save policy**

**Policy 3: Allow Users to Update Their Screenshots**

- Click **New Policy** again
- Name: `Users can update screenshots`
- Target roles: `authenticated`
- Policy command: `UPDATE`
- USING expression:
```sql
(bucket_id = 'project-screenshots'::text) AND
((storage.foldername(name))[1] = (auth.uid())::text)
```
- WITH CHECK expression: Same as USING
- Click **Review** → **Save policy**

**Policy 4: Allow Users to Delete Their Screenshots**

- Click **New Policy** again
- Name: `Users can delete screenshots`
- Target roles: `authenticated`
- Policy command: `DELETE`
- USING expression:
```sql
(bucket_id = 'project-screenshots'::text) AND
((storage.foldername(name))[1] = (auth.uid())::text)
```
- WITH CHECK expression: Leave empty
- Click **Review** → **Save policy**

### Option B: Using SQL (Advanced)

If you have superuser access, you can run this SQL instead:

```sql
-- Policy 1: Upload
CREATE POLICY "Users can upload screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-screenshots' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Read
CREATE POLICY "Public can read screenshots"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'project-screenshots');

-- Policy 3: Update
CREATE POLICY "Users can update screenshots"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-screenshots' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Delete
CREATE POLICY "Users can delete screenshots"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-screenshots' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## Step 4: Verify Setup

1. Go to **Storage** → `project-screenshots`
2. You should see:
   - ✅ Bucket is **Public**
   - ✅ 4 policies are active
3. Check the **Policies** tab shows all 4 policies enabled

## Step 5: Install Puppeteer

Back in your project terminal:

```bash
npm install puppeteer
```

This will download Chromium (~170MB) which is needed for screenshots.

## Step 6: Test Screenshot Capture

1. Generate a new project
2. Wait for generation to complete
3. Check server logs for:
```
[API] Triggering screenshot capture for project...
[SCREENSHOT] Successfully captured and saved screenshot...
```
4. Go to "My Projects" tab
5. You should see the screenshot within ~5 seconds

## Troubleshooting

### "Permission Denied" Error

**Problem**: Screenshot upload fails with permission error

**Solution**:
1. Verify bucket is **Public**
2. Check all 4 policies are created and enabled
3. Verify the policy expressions match exactly as shown above

### "Bucket Not Found" Error

**Problem**: API returns "bucket not found"

**Solution**:
1. Verify bucket name is exactly `project-screenshots`
2. No typos, all lowercase, with hyphen

### Screenshots Not Appearing

**Problem**: Generation completes but no screenshot in gallery

**Solutions**:
1. Check browser console for errors
2. Check server logs for screenshot errors
3. Verify `screenshot_url` column exists:
```sql
SELECT screenshot_url FROM projects LIMIT 1;
```
4. Check Supabase Storage to see if files are uploaded:
   - Storage → project-screenshots → Should see files

### Testing Storage Manually

Upload a test file via dashboard:
1. Go to Storage → project-screenshots
2. Click **Upload file**
3. Upload any image
4. If it works, your policies are correct!

## Environment Variables

For production, add to `.env.local`:

```env
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

This ensures screenshot API is called with the correct domain.

## Summary Checklist

- [ ] Run `setup-screenshot-storage.sql` in SQL Editor
- [ ] Create `project-screenshots` bucket (PUBLIC)
- [ ] Add 4 storage policies (INSERT, SELECT, UPDATE, DELETE)
- [ ] Verify all policies are enabled
- [ ] Run `npm install puppeteer`
- [ ] Test by generating a new project
- [ ] Verify screenshot appears in "My Projects" tab

Once all steps are complete, your screenshot system is ready! 🎉
