# 🚀 Civra Authentication Setup Guide

## What You Need to Know

### 1. **Database URL Explanation**
- `DATABASE_URL="file:./dev.db"` means we're using **SQLite** (a simple file-based database)
- SQLite creates a file called `dev.db` in your `prisma/` folder
- No need to install PostgreSQL, MySQL, or any database server
- Perfect for development - everything runs locally

### 2. **Environment Variables Already Set Up**
✅ Your `.env` file now has everything needed to get started
✅ Your existing API keys (Anthropic, Daytona) are preserved
✅ Temporary OAuth values are set to prevent errors

## Quick Start (Run These Commands)

### Step 1: Install New Dependencies
```bash
npm install
```

### Step 2: Set Up Database
```bash
# Generate Prisma client
npx prisma generate

# Create the database and tables
npx prisma db push
```

### Step 3: Start Your Server
```bash
npm run dev
```

### Step 4: Test Basic Functionality
- Visit: http://localhost:3000
- The site should load without authentication errors
- Sign-in buttons will show but won't work yet (that's normal)

## OAuth Setup (Optional - For Full Auth)

**For now, skip this step.** The app will run fine with temporary values.

When you're ready for real authentication:

### Google OAuth Setup
1. Go to: https://console.developers.google.com/
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Secret to your `.env` file

### GitHub OAuth Setup
1. Go to: https://github.com/settings/developers
2. Click "New OAuth App"
3. Set Homepage URL: `http://localhost:3000`
4. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
5. Copy Client ID and Secret to your `.env` file

## Common Issues & Fixes

### "Module not found" errors
Run: `npm install`

### "Prisma client not generated"
Run: `npx prisma generate`

### "Database doesn't exist"
Run: `npx prisma db push`

### Port 3000 already in use
Run: `npx kill-port 3000` or use: `npm run dev -- -p 3001`

## What's New in Your App

1. **Authentication System**: Users can sign up/sign in
2. **User-Owned Projects**: Each project belongs to a user
3. **Usage Tracking**: Monitor API usage and limits
4. **Workspaces**: Team collaboration features
5. **Protected Routes**: Authentication required for project creation

## File Structure Added

```
├── prisma/
│   └── schema.prisma          # Database schema
├── lib/
│   ├── auth.ts               # NextAuth configuration
│   ├── prisma.ts             # Database client
│   └── auth-utils.ts         # Helper functions
├── app/
│   ├── api/auth/             # Authentication endpoints
│   ├── auth/signin/          # Sign-in page
│   └── usage/                # Usage dashboard
└── components/
    └── providers/            # Session provider
```

Need help with any errors? Share the specific error message and I'll help fix it!