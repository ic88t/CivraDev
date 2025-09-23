-- Credit System Migration Script
-- Run this to add credit management to your existing database

-- Add new enum types if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan') THEN
        CREATE TYPE subscription_plan AS ENUM ('FREE', 'STARTER', 'BUILDER', 'PRO', 'ELITE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
        CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE', 'TRIALING');
    END IF;
END
$$;

-- Create subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan subscription_plan DEFAULT 'FREE',
  status subscription_status DEFAULT 'ACTIVE',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create credit_balances table if it doesn't exist
CREATE TABLE IF NOT EXISTS credit_balances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  message_credits INTEGER DEFAULT 10,
  integration_credits INTEGER DEFAULT 100,
  message_credits_used INTEGER DEFAULT 0,
  integration_credits_used INTEGER DEFAULT 0,
  billing_period_start TIMESTAMPTZ DEFAULT NOW(),
  billing_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create credit_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  credit_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  usage_id UUID REFERENCES usage(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for new tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscription" ON subscriptions;
CREATE POLICY "Users can update own subscription" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own subscription" ON subscriptions;
CREATE POLICY "Users can insert own subscription" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Credit balances policies
DROP POLICY IF EXISTS "Users can view own credit balance" ON credit_balances;
CREATE POLICY "Users can view own credit balance" ON credit_balances
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own credit balance" ON credit_balances;
CREATE POLICY "Users can update own credit balance" ON credit_balances
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own credit balance" ON credit_balances;
CREATE POLICY "Users can insert own credit balance" ON credit_balances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Credit transactions policies
DROP POLICY IF EXISTS "Users can view own credit transactions" ON credit_transactions;
CREATE POLICY "Users can view own credit transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own credit transactions" ON credit_transactions;
CREATE POLICY "Users can insert own credit transactions" ON credit_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create helper functions
CREATE OR REPLACE FUNCTION get_plan_limits(plan_name subscription_plan)
RETURNS TABLE(message_limit INTEGER, integration_limit INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE plan_name
      WHEN 'FREE' THEN 10
      WHEN 'STARTER' THEN 100
      WHEN 'BUILDER' THEN 250
      WHEN 'PRO' THEN 500
      WHEN 'ELITE' THEN 1200
    END AS message_limit,
    CASE plan_name
      WHEN 'FREE' THEN 100
      WHEN 'STARTER' THEN 2000
      WHEN 'BUILDER' THEN 10000
      WHEN 'PRO' THEN 20000
      WHEN 'ELITE' THEN 50000
    END AS integration_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get plan project limits
CREATE OR REPLACE FUNCTION get_plan_project_limit(plan_name subscription_plan)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE plan_name
    WHEN 'FREE' THEN 3
    ELSE -1 -- Unlimited for paid plans
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can create a new project
CREATE OR REPLACE FUNCTION can_create_project(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan subscription_plan;
  project_limit INTEGER;
  current_project_count INTEGER;
BEGIN
  -- Get user's current plan
  SELECT plan INTO user_plan 
  FROM subscriptions 
  WHERE user_id = user_id_param;
  
  -- Default to FREE if no subscription found
  IF user_plan IS NULL THEN
    user_plan := 'FREE';
  END IF;
  
  -- Get project limit for plan
  SELECT get_plan_project_limit(user_plan) INTO project_limit;
  
  -- If unlimited (-1), allow creation
  IF project_limit = -1 THEN
    RETURN TRUE;
  END IF;
  
  -- Count current projects for user
  SELECT COUNT(*) INTO current_project_count
  FROM projects 
  WHERE user_id = user_id_param;
  
  -- Check if under limit
  RETURN current_project_count < project_limit;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credit_balances_user_id ON credit_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id_created ON credit_transactions(user_id, created_at);

-- Initialize existing users with free plan and credits
INSERT INTO subscriptions (user_id, plan, status)
SELECT id, 'FREE', 'ACTIVE' 
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM subscriptions WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO credit_balances (user_id, message_credits, integration_credits, message_credits_used, integration_credits_used)
SELECT id, 10, 100, 0, 0
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM credit_balances WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- Update the user creation trigger to include credit setup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name')
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert default subscription (FREE)
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'FREE', 'ACTIVE')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Initialize credit balance
  INSERT INTO public.credit_balances (
    user_id, 
    message_credits, 
    integration_credits,
    message_credits_used,
    integration_credits_used,
    billing_period_start,
    billing_period_end
  ) VALUES (
    NEW.id,
    10,
    100,
    0,
    0,
    NOW(),
    NOW() + INTERVAL '1 month'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Credit system migration completed successfully!';
  RAISE NOTICE 'All existing users have been initialized with FREE plan and 10 message credits.';
END
$$;
