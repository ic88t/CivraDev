-- Step 1: Add screenshot_url column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN projects.screenshot_url IS 'URL to the project screenshot/preview image stored in Supabase Storage';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_screenshot_url ON projects(screenshot_url);

-- Note: Storage bucket and policies must be created via Supabase Dashboard
-- Go to: Storage -> Create a new bucket -> Name: "project-screenshots" -> Public: YES
-- Then configure policies in the Storage UI
