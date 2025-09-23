# 🔐 OAuth Setup Guide - Google & GitHub

## 🎯 **Google OAuth Setup**

### Step 1: Go to Google Cloud Console
1. Visit: https://console.developers.google.com/
2. Sign in with your Google account

### Step 2: Create/Select a Project
1. Click on the project dropdown at the top
2. Click "New Project" or select an existing one
3. Give it a name like "Civra Web3 App"

### Step 3: Enable Google+ API
1. Go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click on it and press **Enable**

### Step 4: Create OAuth Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. If prompted, configure the OAuth consent screen:
   - Choose **External** (unless you have a Google Workspace)
   - Fill in:
     - **App name**: Civra
     - **User support email**: Your email
     - **Developer contact**: Your email
   - Click **Save and Continue** through the steps

### Step 5: Configure OAuth Client
1. **Application type**: Web application
2. **Name**: Civra Local Dev
3. **Authorized redirect URIs**: Add this EXACTLY:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
4. Click **Create**

### Step 6: Copy Credentials
1. Copy the **Client ID** and **Client Secret**
2. Update your `.env` file:
   ```
   GOOGLE_CLIENT_ID="your-actual-client-id-here"
   GOOGLE_CLIENT_SECRET="your-actual-client-secret-here"
   ```

---

## 🐙 **GitHub OAuth Setup**

### Step 1: Go to GitHub Settings
1. Visit: https://github.com/settings/developers
2. Sign in to your GitHub account

### Step 2: Create OAuth App
1. Click **New OAuth App**
2. Fill in the details:
   - **Application name**: Civra Web3 App
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
   - **Application description**: Web3 app builder (optional)
3. Click **Register application**

### Step 3: Generate Client Secret
1. After creating the app, click **Generate a new client secret**
2. Copy both the **Client ID** and **Client Secret**

### Step 4: Update Environment Variables
1. Update your `.env` file:
   ```
   GITHUB_ID="your-github-client-id-here"
   GITHUB_SECRET="your-github-client-secret-here"
   ```

---

## ⚡ **Quick Test**

After setting up both:

1. **Restart your server**:
   ```bash
   npm run dev
   ```

2. **Test the login**:
   - Go to http://localhost:3000
   - Click "Log in"
   - Try both Google and GitHub buttons
   - They should redirect and work properly!

---

## 🔧 **Troubleshooting**

### "Invalid redirect URI"
- Make sure you used **exactly**: `http://localhost:3000/api/auth/callback/google`
- No trailing slashes, exactly this URL

### "OAuth consent screen not configured"
- Go back to Google Cloud Console
- Configure the OAuth consent screen
- Add your email as a test user

### "Client secret invalid"
- Double-check you copied the secret correctly
- Make sure there are no extra spaces
- Generate a new secret if needed

### Login popup closes immediately
- Clear your browser cache and cookies for localhost
- Try in an incognito/private window
- Check browser console for error messages

Need help? Share any error messages you see!