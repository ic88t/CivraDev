-- Add screenshot_url column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN projects.screenshot_url IS 'URL to the project screenshot/preview image';
