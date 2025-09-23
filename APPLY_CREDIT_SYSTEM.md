# Apply Credit System to Your Database

## Current Situation
Your database currently uses the basic schema (`supabase-schema.sql`) but your code expects the credit system tables from `supabase-schema-credits-safe.sql`.

## What You Need to Do

### Step 1: Apply the Credit System Schema
1. Go to your **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the contents of `supabase-schema-credits-safe.sql`
3. Click **Run** to execute the SQL

This will safely add:
- `subscriptions` table
- `credit_balances` table  
- `credit_transactions` table
- Credit management functions
- Updated `handle_new_user` trigger

### Step 2: Verify the Setup
After running the schema, you should see these new tables in your **Table Editor**:
- ✅ `subscriptions`
- ✅ `credit_balances`
- ✅ `credit_transactions`

### Step 3: Test the System
1. **Refresh your app** - the errors should disappear
2. **Check the navbar** - you should see your credits displayed
3. **Visit `/workspaces`** - should work without errors
4. **Try generating a project** - should consume credits properly

## What This Schema Does

### For Existing Users:
- Creates FREE plan subscriptions automatically
- Initializes 10 message credits + 100 integration credits
- Preserves all existing projects and data

### For New Users:
- Automatically creates profile + subscription + credits on signup
- No manual setup required

### Safety Features:
- Uses `IF NOT EXISTS` - won't break existing tables
- Uses `ON CONFLICT DO NOTHING` - won't duplicate data
- Graceful fallbacks in code if tables are missing

## Expected Results After Applying

✅ **Credit display in navbar** - shows "10 credits | FREE"
✅ **No more 500 errors** from `/api/usage`
✅ **Workspaces work properly** with real project data
✅ **Credit consumption** works for generation and chat
✅ **Project limits** enforced (3 max for FREE users)

## Troubleshooting

If you still see errors after applying the schema:
1. **Check Supabase logs** for any SQL errors
2. **Refresh your browser** to clear cached requests
3. **Restart your development server**

The credit system is designed to work seamlessly with your existing data!
