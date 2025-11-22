# Google OAuth Setup Guide

## Problem

When clicking "Continue with Google", you get the error:
```json
{
  "code": 400,
  "error_code": "validation_failed",
  "msg": "Unsupported provider: provider is not enabled"
}
```

This means Google OAuth is not enabled in your Supabase project.

## Solution

Follow these steps to enable Google OAuth:

### Step 1: Create Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create or Select a Project**
   - Click the project dropdown at the top
   - Click "New Project" or select an existing project
   - Give it a name (e.g., "Community Platform")
   - Click "Create"

3. **Enable Google+ API**
   - In the left sidebar, go to **APIs & Services** → **Library**
   - Search for "Google+ API" or "Google Identity"
   - Click on it and click **Enable**

4. **Create OAuth 2.0 Credentials**
   - Go to **APIs & Services** → **Credentials**
   - Click **+ CREATE CREDENTIALS** → **OAuth client ID**
   - If prompted, configure the OAuth consent screen first:
     - Choose **External** (unless you have a Google Workspace)
     - Fill in the required fields:
       - App name: Your app name (e.g., "Community Platform")
       - User support email: Your email
       - Developer contact: Your email
     - Click **Save and Continue**
     - Add scopes: `email`, `profile`, `openid`
     - Click **Save and Continue**
     - Add test users (optional for development)
     - Click **Save and Continue**
     - Review and click **Back to Dashboard**

5. **Create OAuth Client ID**
   - Application type: **Web application**
   - Name: "Community Platform Web Client"
   - **Authorized JavaScript origins:**
     - Add: `https://tslzeujnqdwnwnufmtlt.supabase.co`
     - Add: `http://localhost:3000` (for local development)
     - Add: `https://hustlers-iota.vercel.app` (your production URL)
   - **Authorized redirect URIs:**
     - Add: `https://tslzeujnqdwnwnufmtlt.supabase.co/auth/v1/callback`
     - Add: `http://localhost:3000/auth/callback` (for local development)
     - Add: `https://hustlers-iota.vercel.app/auth/callback` (for production)
   - Click **Create**
   - **Copy the Client ID and Client Secret** (you'll need these in the next step)

### Step 2: Configure Google OAuth in Supabase

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/tslzeujnqdwnufmtlt
   - Navigate to **Authentication** → **Providers**

2. **Enable Google Provider**
   - Find **Google** in the list of providers
   - Toggle it to **Enabled**

3. **Add OAuth Credentials**
   - **Client ID (for OAuth)**: Paste your Google Client ID
   - **Client Secret (for OAuth)**: Paste your Google Client Secret
   - Click **Save**

### Step 3: Verify Redirect URLs

Make sure these redirect URLs are configured:

**In Google Cloud Console:**
- `https://tslzeujnqdwnwnufmtlt.supabase.co/auth/v1/callback`
- `http://localhost:3000/auth/callback` (for local dev)
- `https://hustlers-iota.vercel.app/auth/callback` (for production)

**In Supabase:**
- Go to **Authentication** → **URL Configuration**
- **Site URL**: `https://hustlers-iota.vercel.app` (or your production URL)
- **Redirect URLs**: Should include:
  - `https://hustlers-iota.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback` (for local dev)

### Step 4: Test the Integration

1. **Restart your development server** (if running locally)
   ```bash
   npm run dev
   ```

2. **Test Google OAuth**
   - Go to your login page
   - Click "Continue with Google"
   - You should be redirected to Google's sign-in page
   - After signing in, you should be redirected back to your app

## Troubleshooting

### Still getting "provider is not enabled" error?

1. **Double-check Supabase settings:**
   - Go to **Authentication** → **Providers**
   - Make sure Google is **Enabled** (toggle should be green/on)
   - Verify Client ID and Client Secret are saved correctly

2. **Clear browser cache:**
   - Clear cookies and cache for your site
   - Try in an incognito/private window

3. **Verify redirect URLs match exactly:**
   - URLs are case-sensitive
   - Must include `https://` or `http://`
   - No trailing slashes

### Getting "redirect_uri_mismatch" error?

- This means the redirect URL in your app doesn't match what's configured in Google Cloud Console
- Make sure you added the exact redirect URL to Google Cloud Console:
  - `https://tslzeujnqdwnwnufmtlt.supabase.co/auth/v1/callback`

### OAuth works locally but not in production?

- Make sure you added your production URL to Google Cloud Console:
  - Authorized JavaScript origins: `https://hustlers-iota.vercel.app`
  - Authorized redirect URIs: `https://hustlers-iota.vercel.app/auth/callback`
- Verify Supabase redirect URLs include your production URL

## Additional Notes

- **OAuth Consent Screen**: If your app is in "Testing" mode, only test users can sign in. To make it public, you need to submit for verification (or publish it if it's a simple app).
- **Rate Limits**: Google has rate limits on OAuth requests. If you hit limits, you may need to wait or request higher limits.
- **Security**: Never commit your OAuth Client Secret to version control. It's stored securely in Supabase.

## Quick Checklist

- [ ] Google Cloud Console project created
- [ ] Google+ API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 Client ID created
- [ ] Redirect URIs added to Google Cloud Console
- [ ] Google provider enabled in Supabase
- [ ] Client ID and Secret added to Supabase
- [ ] Redirect URLs configured in Supabase
- [ ] Tested the OAuth flow

## Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Dashboard](https://supabase.com/dashboard/project/tslzeujnqdwnwnufmtlt)

