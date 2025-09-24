-- Fix missing credit system functions that are causing user creation to fail
-- This creates the necessary functions and tables if they don't exist

-- First, check if credit system tables exist, if not create them
DO $$
BEGIN
    -- Create subscription_plan enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan') THEN
        CREATE TYPE subscription_plan AS ENUM ('FREE', 'STARTER', 'BUILDER', 'PRO', 'ELITE');
    END IF;

    -- Create subscription_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
        CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE', 'TRIALING');
    END IF;

    -- Create subscriptions table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
        CREATE TABLE subscriptions (
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

        -- Enable RLS
        ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

        -- Add policies
        CREATE POLICY "Users can view own subscription" ON subscriptions
            FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can update own subscription" ON subscriptions
            FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own subscription" ON subscriptions
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Create credit_balances table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_balances') THEN
        CREATE TABLE credit_balances (
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

        -- Enable RLS
        ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;

        -- Add policies
        CREATE POLICY "Users can view own credit balance" ON credit_balances
            FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can update own credit balance" ON credit_balances
            FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own credit balance" ON credit_balances
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Function to get plan credit limits
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

-- Function to reset monthly credits
CREATE OR REPLACE FUNCTION reset_monthly_credits(user_id_param UUID)
RETURNS VOID AS $$
DECLARE
  user_plan subscription_plan;
  msg_limit INTEGER;
  int_limit INTEGER;
BEGIN
  -- Get user's current plan
  SELECT plan INTO user_plan
  FROM subscriptions
  WHERE user_id = user_id_param;

  -- Default to FREE if no subscription found
  IF user_plan IS NULL THEN
    user_plan := 'FREE';
  END IF;

  -- Get plan limits
  SELECT message_limit, integration_limit INTO msg_limit, int_limit
  FROM get_plan_limits(user_plan);

  -- Reset credits (upsert)
  INSERT INTO credit_balances (
    user_id,
    message_credits,
    integration_credits,
    message_credits_used,
    integration_credits_used,
    billing_period_start,
    billing_period_end
  ) VALUES (
    user_id_param,
    msg_limit,
    int_limit,
    0,
    0,
    NOW(),
    NOW() + INTERVAL '1 month'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    message_credits = msg_limit,
    integration_credits = int_limit,
    message_credits_used = 0,
    integration_credits_used = 0,
    billing_period_start = NOW(),
    billing_period_end = NOW() + INTERVAL '1 month',
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a robust user creation function that handles errors gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_image TEXT;
BEGIN
  -- Extract user info with fallbacks for different OAuth providers
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',     -- Google provides full_name
    NEW.raw_user_meta_data->>'name',          -- Some providers use name
    NEW.raw_user_meta_data->>'user_name',     -- GitHub sometimes uses user_name
    SPLIT_PART(NEW.email, '@', 1)             -- Fallback to email username
  );

  user_image := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',    -- GitHub uses avatar_url
    NEW.raw_user_meta_data->>'picture'        -- Google uses picture
  );

  -- Insert profile with error handling
  BEGIN
    INSERT INTO public.profiles (id, name, image)
    VALUES (NEW.id, user_name, user_image);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error creating user profile for %: %', NEW.id, SQLERRM;
  END;

  -- Insert default subscription with error handling
  BEGIN
    INSERT INTO public.subscriptions (user_id, plan, status)
    VALUES (NEW.id, 'FREE', 'ACTIVE')
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error creating subscription for %: %', NEW.id, SQLERRM;
  END;

  -- Initialize credit balance with error handling
  BEGIN
    PERFORM reset_monthly_credits(NEW.id);
  EXCEPTION
    WHEN OTHERS THEN
      -- If credit system fails, create basic credit balance manually
      RAISE NOTICE 'Error initializing credits for %, creating basic balance: %', NEW.id, SQLERRM;
      INSERT INTO public.credit_balances (
        user_id,
        message_credits,
        integration_credits,
        message_credits_used,
        integration_credits_used
      ) VALUES (
        NEW.id,
        10,   -- FREE plan default
        100,  -- FREE plan default
        0,
        0
      ) ON CONFLICT (user_id) DO NOTHING;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance (if they don't exist)
DO $$
BEGIN
    -- Check if index exists before creating
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_credit_balances_user_id') THEN
        CREATE INDEX idx_credit_balances_user_id ON credit_balances(user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subscriptions_user_id') THEN
        CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
    END IF;
END $$;