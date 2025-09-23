-- =============================================
-- ROLLBACK SCRIPT - Credit System
-- Purpose: Remove credit system tables if something goes wrong
-- =============================================

-- ⚠️  WARNING: This will delete all credit system data!
-- Only run this if you need to completely remove the credit system

-- Step 1: Drop credit system tables (in order due to foreign keys)
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS credit_balances CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;

-- Step 2: Drop credit system functions
DROP FUNCTION IF EXISTS get_plan_limits(text);
DROP FUNCTION IF EXISTS get_plan_project_limit(text);
DROP FUNCTION IF EXISTS can_create_project(uuid);
DROP FUNCTION IF EXISTS reset_monthly_credits();
DROP FUNCTION IF EXISTS track_usage(uuid, text, integer, text);

-- Step 3: Drop credit system triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS reset_credits_monthly ON credit_balances;

-- Step 4: Drop credit system policies (if any)
-- Note: These might not exist if RLS wasn't set up
DROP POLICY IF EXISTS "Users can view own credit balance" ON credit_balances;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can view own credit transactions" ON credit_transactions;

-- Step 5: Verify cleanup
SELECT 
  table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('subscriptions', 'credit_balances', 'credit_transactions');

-- Should return no rows if cleanup was successful

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check remaining tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check remaining functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%credit%'
ORDER BY routine_name;

-- =============================================
-- NOTES
-- =============================================
-- After running this script:
-- 1. Your original tables (projects, workspaces, etc.) should be intact
-- 2. All credit system functionality will be removed
-- 3. The app will fall back to default free tier limits
-- 4. You can re-run the credit system migration later
