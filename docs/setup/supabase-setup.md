# Supabase Setup Guide

## ✅ Environment Variables Configured

Your Supabase credentials have been set up in `.env.local`:

- **Project URL**: `https://tslzeujnqdwnwnufmtlt.supabase.co`
- **Anon Key**: Configured

## Next Steps

### 1. Set Up Database Schema

You need to run the database schema SQL script to create the `profiles` table:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/tslzeujnqdwnufmtlt
2. Navigate to **SQL Editor**
3. Copy the SQL script from `docs/database/schema.md`
4. Paste and execute it

This will create:
- `profiles` table
- Row Level Security policies
- Automatic profile creation trigger

### 2. Configure OAuth Providers (Optional)

To enable Google/GitHub OAuth:

1. Go to **Authentication → Providers** in Supabase Dashboard
2. Enable **Google** or **GitHub**
3. Add OAuth credentials:
   - **Google**: Get from [Google Cloud Console](https://console.cloud.google.com/)
   - **GitHub**: Get from [GitHub Developer Settings](https://github.com/settings/developers)
4. Add redirect URL: `https://tslzeujnqdwnwnufmtlt.supabase.co/auth/v1/callback`

### 3. Test the Application

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000

3. Test authentication:
   - Go to `/signup` to create an account
   - Check your email for verification
   - Login at `/login`
   - Access protected `/dashboard`

### 4. Email Configuration (Optional)

By default, Supabase uses their email service. To customize:

1. Go to **Authentication → Email Templates** in Supabase Dashboard
2. Customize email templates
3. For custom SMTP, go to **Settings → Auth** and configure SMTP settings

## Security Notes

- ✅ `.env.local` is in `.gitignore` (won't be committed)
- ✅ Anon key is safe to use in client-side code (protected by RLS)
- ⚠️ Never commit `.env.local` to version control
- ⚠️ Service role key should never be exposed to client-side

## Troubleshooting

### Build Errors
If you see build errors about missing environment variables:
- Make sure `.env.local` exists in the project root
- Restart the dev server after creating `.env.local`

### Authentication Not Working
- Verify environment variables are correct
- Check Supabase Dashboard → Authentication → Users
- Check browser console for errors
- Verify database schema is set up

### OAuth Not Working
- Verify OAuth provider is enabled in Supabase
- Check redirect URLs are configured correctly
- Verify OAuth credentials are correct

## Resources

- [Supabase Dashboard](https://supabase.com/dashboard/project/tslzeujnqdwnufmtlt)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/auth/quickstarts/nextjs)

