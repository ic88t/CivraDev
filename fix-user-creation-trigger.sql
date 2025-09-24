-- Fix the user creation trigger to handle various OAuth providers properly
-- This replaces the existing trigger with a more robust version

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_image TEXT;
BEGIN
  -- Try to extract name from various possible locations
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',     -- Google provides full_name
    NEW.raw_user_meta_data->>'name',          -- Some providers use name
    NEW.raw_user_meta_data->>'user_name',     -- GitHub sometimes uses user_name
    SPLIT_PART(NEW.email, '@', 1)             -- Fallback to email username
  );

  -- Try to extract avatar/image from various possible locations
  user_image := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',    -- GitHub uses avatar_url
    NEW.raw_user_meta_data->>'picture'        -- Google uses picture
  );

  -- Insert new profile with error handling
  INSERT INTO public.profiles (id, name, image)
  VALUES (NEW.id, user_name, user_image);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE NOTICE 'Error creating user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also add an updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();