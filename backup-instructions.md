# 🛡️ Supabase Backup Guide

## Method 1: SQL Schema Backup (Recommended)

### Step 1: Get Current Schema
1. Go to your **Supabase Dashboard**
2. Click **"SQL Editor"** in the left sidebar
3. Click **"Show current schema"** button (top right)
4. Copy the generated SQL
5. Save it as `backup-current-schema.sql`

### Step 2: Backup Data (Optional)
1. In SQL Editor, run:
```sql
-- Backup all your data
SELECT * FROM projects;
SELECT * FROM workspaces;
-- Add other tables as needed
```

## Method 2: Supabase CLI (Most Complete)

### Install Supabase CLI
```bash
npm install -g supabase
```

### Login and Link Project
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### Create Full Backup
```bash
# Backup schema + data
supabase db dump --file backup-full.sql

# Backup only schema
supabase db dump --schema-only --file backup-schema-only.sql

# Backup only data
supabase db dump --data-only --file backup-data-only.sql
```

## Method 3: Manual Table Backup

### Backup Individual Tables
```sql
-- In Supabase SQL Editor, run these one by one:

-- 1. Backup projects table
CREATE TABLE projects_backup AS SELECT * FROM projects;

-- 2. Backup workspaces table  
CREATE TABLE workspaces_backup AS SELECT * FROM workspaces;

-- 3. Backup usage table (if exists)
CREATE TABLE usage_backup AS SELECT * FROM usage;

-- 4. List all tables to see what you have
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

## Method 4: Export via Dashboard

### Data Export
1. Go to **Supabase Dashboard**
2. Click **"Table Editor"**
3. For each table:
   - Click the table name
   - Click **"Export"** button
   - Choose CSV or JSON format
   - Download the file

## 🚨 Emergency Restore

### If Something Goes Wrong:

#### Option A: Restore from SQL Backup
1. Go to **Supabase Dashboard > SQL Editor**
2. Paste your `backup-current-schema.sql`
3. Click **"Run"**

#### Option B: Restore from CLI Backup
```bash
supabase db reset --file backup-full.sql
```

#### Option C: Restore Individual Tables
```sql
-- Drop problematic tables
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS credit_balances CASCADE;
DROP TABLE IF EXISTS credit_transactions CASCADE;

-- Restore from backup tables
INSERT INTO projects SELECT * FROM projects_backup;
INSERT INTO workspaces SELECT * FROM workspaces_backup;
-- etc.
```

## 🔧 Before Adding Credit System

### Recommended Backup Steps:
1. **Get current schema** (Method 1)
2. **Create table backups** (Method 3)
3. **Test the migration** on a copy if possible
4. **Keep backups in multiple places**

### Quick Safety Check:
```sql
-- Run this before making changes
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

## 📁 File Organization

Keep these backup files:
- `backup-current-schema.sql` - Full schema
- `backup-full.sql` - Schema + data (if using CLI)
- `backup-YYYY-MM-DD.sql` - Timestamped backups
- `rollback-credit-system.sql` - Specific rollback script
