-- Fix existing users who don't have subscription records
-- This will create FREE subscriptions and credit balances for existing users

-- First, let's see what users exist without subscriptions
-- (Run this to check first)
SELECT 
  au.id,
  au.email,
  p.name,
  s.plan IS NULL as missing_subscription,
  cb.user_id IS NULL as missing_credits
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
LEFT JOIN public.subscriptions s ON au.id = s.user_id
LEFT JOIN public.credit_balances cb ON au.id = cb.user_id
WHERE au.email IS NOT NULL;

-- Create missing subscriptions for existing users
INSERT INTO public.subscriptions (user_id, plan, status)
SELECT 
  au.id,
  'FREE'::subscription_plan,
  'ACTIVE'::subscription_status
FROM auth.users au
LEFT JOIN public.subscriptions s ON au.id = s.user_id
WHERE au.email IS NOT NULL 
  AND s.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Initialize credit balances for users without them
-- This will call the reset_monthly_credits function for each user
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT au.id 
    FROM auth.users au
    LEFT JOIN public.credit_balances cb ON au.id = cb.user_id
    WHERE au.email IS NOT NULL 
      AND cb.user_id IS NULL
  LOOP
    PERFORM reset_monthly_credits(user_record.id);
  END LOOP;
END $$;

-- Verify the fix worked
SELECT 
  'Fixed users:' as status,
  COUNT(*) as count
FROM auth.users au
JOIN public.subscriptions s ON au.id = s.user_id
JOIN public.credit_balances cb ON au.id = cb.user_id
WHERE au.email IS NOT NULL;
