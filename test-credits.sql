-- Test Credit System
-- Run this to verify your credit system is working correctly

-- Check if tables exist
SELECT 
  CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscriptions') 
    THEN '✅ subscriptions table exists' 
    ELSE '❌ subscriptions table missing' 
  END as subscriptions_check,
  CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'credit_balances') 
    THEN '✅ credit_balances table exists' 
    ELSE '❌ credit_balances table missing' 
  END as credit_balances_check,
  CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'credit_transactions') 
    THEN '✅ credit_transactions table exists' 
    ELSE '❌ credit_transactions table missing' 
  END as credit_transactions_check;

-- Check if functions exist
SELECT 
  CASE WHEN EXISTS (SELECT FROM information_schema.routines WHERE routine_name = 'get_plan_limits') 
    THEN '✅ get_plan_limits function exists' 
    ELSE '❌ get_plan_limits function missing' 
  END as get_plan_limits_check,
  CASE WHEN EXISTS (SELECT FROM information_schema.routines WHERE routine_name = 'can_create_project') 
    THEN '✅ can_create_project function exists' 
    ELSE '❌ can_create_project function missing' 
  END as can_create_project_check;

-- Show sample data for existing users
SELECT 
  'User Count' as metric,
  COUNT(*) as value
FROM auth.users
UNION ALL
SELECT 
  'Subscriptions Count' as metric,
  COUNT(*) as value
FROM subscriptions
UNION ALL
SELECT 
  'Credit Balances Count' as metric,
  COUNT(*) as value
FROM credit_balances;

-- Show credit distribution
SELECT 
  s.plan,
  COUNT(*) as user_count,
  AVG(cb.message_credits) as avg_message_credits,
  AVG(cb.message_credits_used) as avg_credits_used
FROM subscriptions s
LEFT JOIN credit_balances cb ON s.user_id = cb.user_id
GROUP BY s.plan
ORDER BY 
  CASE s.plan 
    WHEN 'FREE' THEN 1 
    WHEN 'STARTER' THEN 2 
    WHEN 'BUILDER' THEN 3 
    WHEN 'PRO' THEN 4 
    WHEN 'ELITE' THEN 5 
  END;

-- Test the functions
SELECT 'Function Tests' as test_section;

-- Test get_plan_limits function
SELECT 
  plan,
  message_limit,
  integration_limit
FROM (
  VALUES 
    ('FREE'::subscription_plan),
    ('STARTER'::subscription_plan),
    ('PRO'::subscription_plan)
) AS plans(plan)
CROSS JOIN LATERAL get_plan_limits(plan);

-- Test with a real user (if any exist)
DO $$
DECLARE
  test_user_id UUID;
  can_create BOOLEAN;
BEGIN
  -- Get a test user
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Test can_create_project function
    SELECT can_create_project(test_user_id) INTO can_create;
    RAISE NOTICE 'Test user % can create project: %', test_user_id, can_create;
  ELSE
    RAISE NOTICE 'No users found for testing';
  END IF;
END
$$;

-- Show recent activity (if any)
SELECT 
  'Recent Credit Transactions' as section,
  COUNT(*) as transaction_count
FROM credit_transactions
WHERE created_at > NOW() - INTERVAL '7 days';

SELECT '✅ Credit system test completed!' as result;
