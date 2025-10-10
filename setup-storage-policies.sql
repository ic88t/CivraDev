-- =====================================================
-- COMPLETE SCREENSHOT STORAGE SETUP - SQL VERSION
-- =====================================================
-- Run this in Supabase SQL Editor
-- This creates the bucket, policies, and database schema
-- =====================================================

-- Step 1: Create the storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-screenshots',
  'project-screenshots',
  true,
  52428800, -- 50MB limit
  NULL -- Allow all MIME types
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Step 2: Create storage policies
-- Note: Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can upload screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Public can read screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can update screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete screenshots" ON storage.objects;

-- Policy 1: Allow authenticated users to upload screenshots to their own folder
CREATE POLICY "Users can upload screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-screenshots' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Allow public read access to all screenshots
CREATE POLICY "Public can read screenshots"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'project-screenshots'
);

-- Policy 3: Allow users to update their own screenshots
CREATE POLICY "Users can update screenshots"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-screenshots' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'project-screenshots' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Allow users to delete their own screenshots
CREATE POLICY "Users can delete screenshots"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-screenshots' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Step 3: Add screenshot_url column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN projects.screenshot_url IS 'URL to the project screenshot/preview image stored in Supabase Storage';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_screenshot_url ON projects(screenshot_url);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check bucket was created
SELECT id, name, public FROM storage.buckets WHERE id = 'project-screenshots';

-- Check policies were created
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
AND policyname LIKE '%screenshot%'
ORDER BY policyname;

-- Check column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'screenshot_url';

-- =====================================================
-- If you get permission errors, you may need to:
-- 1. Run this in the SQL Editor (not via API)
-- 2. Or use the Dashboard UI method instead
-- =====================================================
