-- Enhanced schema with credit and subscription system
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE workspace_role AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');
CREATE TYPE project_status AS ENUM ('CREATING', 'ACTIVE', 'STOPPED', 'ERROR');
CREATE TYPE project_visibility AS ENUM ('PRIVATE', 'WORKSPACE', 'PUBLIC');
CREATE TYPE usage_type AS ENUM ('PROJECT_CREATION', 'CHAT_MESSAGE', 'PREVIEW_GENERATION', 'DEPLOYMENT');
CREATE TYPE subscription_plan AS ENUM ('FREE', 'STARTER', 'BUILDER', 'PRO', 'ELITE');
CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE', 'TRIALING');

-- Users table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
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

-- Credit balances table
CREATE TABLE credit_balances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  message_credits INTEGER DEFAULT 10, -- Free tier default
  integration_credits INTEGER DEFAULT 100, -- Free tier default
  message_credits_used INTEGER DEFAULT 0,
  integration_credits_used INTEGER DEFAULT 0,
  billing_period_start TIMESTAMPTZ DEFAULT NOW(),
  billing_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspaces table
CREATE TABLE workspaces (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace members table
CREATE TABLE workspace_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  role workspace_role DEFAULT 'EDITOR',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, workspace_id)
);

-- Projects table
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  sandbox_id TEXT UNIQUE,
  preview_url TEXT,
  status project_status DEFAULT 'CREATING',
  visibility project_visibility DEFAULT 'PRIVATE',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced usage tracking table
CREATE TABLE usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type usage_type NOT NULL,
  credits_consumed INTEGER DEFAULT 1,
  details JSONB,
  project_id UUID REFERENCES projects(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit transactions table for detailed tracking
CREATE TABLE credit_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- 'debit', 'credit', 'reset'
  credit_type TEXT NOT NULL, -- 'message', 'integration'
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  usage_id UUID REFERENCES usage(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Subscriptions policies
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Credit balances policies
CREATE POLICY "Users can view own credit balance" ON credit_balances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credit balance" ON credit_balances
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit balance" ON credit_balances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Projects policies
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (
    auth.uid() = user_id OR
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (
    auth.uid() = user_id OR
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

-- Usage policies
CREATE POLICY "Users can view own usage" ON usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Credit transactions policies
CREATE POLICY "Users can view own credit transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit transactions" ON credit_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Workspace policies
CREATE POLICY "Members can view workspace" ON workspaces
  FOR SELECT USING (
    id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view workspace members" ON workspace_members
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

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
  
  -- Reset credits
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
$$ LANGUAGE plpgsql;

-- Function to consume credits
CREATE OR REPLACE FUNCTION consume_credits(
  user_id_param UUID,
  credit_type_param TEXT,
  amount_param INTEGER,
  description_param TEXT DEFAULT NULL,
  usage_id_param UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
  current_used INTEGER;
  new_used INTEGER;
  credit_limit INTEGER;
BEGIN
  -- Get current balance and usage
  IF credit_type_param = 'message' THEN
    SELECT message_credits, message_credits_used 
    INTO credit_limit, current_used
    FROM credit_balances 
    WHERE user_id = user_id_param;
  ELSIF credit_type_param = 'integration' THEN
    SELECT integration_credits, integration_credits_used 
    INTO credit_limit, current_used
    FROM credit_balances 
    WHERE user_id = user_id_param;
  ELSE
    RETURN FALSE;
  END IF;
  
  -- Check if user has enough credits
  current_balance := credit_limit - current_used;
  IF current_balance < amount_param THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate new usage
  new_used := current_used + amount_param;
  
  -- Update credit balance
  IF credit_type_param = 'message' THEN
    UPDATE credit_balances 
    SET message_credits_used = new_used, updated_at = NOW()
    WHERE user_id = user_id_param;
  ELSIF credit_type_param = 'integration' THEN
    UPDATE credit_balances 
    SET integration_credits_used = new_used, updated_at = NOW()
    WHERE user_id = user_id_param;
  END IF;
  
  -- Record transaction
  INSERT INTO credit_transactions (
    user_id,
    transaction_type,
    credit_type,
    amount,
    balance_after,
    description,
    usage_id
  ) VALUES (
    user_id_param,
    'debit',
    credit_type_param,
    amount_param,
    credit_limit - new_used,
    description_param,
    usage_id_param
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create profile and credits on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  
  -- Insert default subscription (FREE)
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'FREE', 'ACTIVE');
  
  -- Initialize credit balance
  PERFORM reset_monthly_credits(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile, subscription, and credits on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

-- Index for better performance
CREATE INDEX idx_credit_balances_user_id ON credit_balances(user_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_usage_user_id_created ON usage(user_id, created_at);
CREATE INDEX idx_credit_transactions_user_id_created ON credit_transactions(user_id, created_at);
CREATE INDEX idx_projects_user_id ON projects(user_id);
