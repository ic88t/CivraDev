-- =============================================
-- SIMPLE BACKUP - Run this BEFORE adding credit system
-- =============================================

-- Step 1: Create backup tables
CREATE TABLE IF NOT EXISTS projects_backup AS SELECT * FROM projects;
CREATE TABLE IF NOT EXISTS workspaces_backup AS SELECT * FROM workspaces;

-- Step 2: Backup usage table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usage') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS usage_backup AS SELECT * FROM usage';
    END IF;
END $$;

-- Step 3: Show what we backed up
SELECT 'Backup completed successfully!' as status;

-- Show backup tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%_backup'
ORDER BY table_name;

-- =============================================
-- TO RESTORE LATER (if needed):
-- =============================================
-- DROP TABLE IF EXISTS projects CASCADE;
-- CREATE TABLE projects AS SELECT * FROM projects_backup;
-- 
-- DROP TABLE IF EXISTS workspaces CASCADE;  
-- CREATE TABLE workspaces AS SELECT * FROM workspaces_backup;
-- 
-- -- Restore usage if it existed
-- IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usage_backup') THEN
--     DROP TABLE IF EXISTS usage CASCADE;
--     CREATE TABLE usage AS SELECT * FROM usage_backup;
-- END IF;
