-- =============================================
-- QUICK BACKUP - Run this BEFORE adding credit system
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

-- Step 3: Show current schema
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Step 4: Show table row counts (simplified)
SELECT 
    'projects' as table_name,
    COUNT(*) as row_count
FROM projects
UNION ALL
SELECT 
    'workspaces' as table_name,
    COUNT(*) as row_count
FROM workspaces
UNION ALL
SELECT 
    'usage' as table_name,
    COUNT(*) as row_count
FROM usage
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usage');

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
