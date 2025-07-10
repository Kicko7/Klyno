# Clerk Authentication Setup Guide

This guide will help you set up Clerk authentication for your LobeChat application.

## Step 1: Create a Clerk Account

1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Sign up for a free account or log in if you already have one

## Step 2: Create a New Application

1. Click "Add application" 
2. Choose "Next.js" as your framework
3. Give your application a name (e.g., "LobeChat")
4. Choose your authentication methods (email, social logins, etc.)
5. Click "Create application"

## Step 3: Get Your API Keys

After creating your application, you'll see the API keys page:

1. Copy the **Publishable key** (starts with `pk_test_` or `pk_live_`)
2. Copy the **Secret key** (starts with `sk_test_` or `sk_live_`)

## Step 4: Configure Environment Variables

1. Create a `.env.local` file in your project root (if it doesn't exist)
2. Add your Clerk credentials:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here
```

## Step 5: Configure Clerk Application Settings

In your Clerk dashboard:

1. Go to **User & Authentication** → **Social Connections** (optional)
   - Enable any social login providers you want (Google, GitHub, etc.)

2. Go to **User & Authentication** → **Email, Phone, Username**
   - Configure which fields are required for sign-up

3. Go to **Sessions & Users** → **Restrictions**
   - Configure any restrictions (allowlist, blocklist, etc.)

## Step 6: Test Your Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Visit the test page to verify configuration:
   ```
   http://localhost:3210/test-clerk
   ```

3. If everything is green, try accessing the login page:
   ```
   http://localhost:3210/login
   ```

## Step 7: Access Authentication Pages

Once configured, you can access:

- **Sign In**: `http://localhost:3210/login`
- **Sign Up**: `http://localhost:3210/signup`

## Troubleshooting

### "Page Not Found" Error
- Make sure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set in your `.env.local`
- Restart your development server after adding environment variables

### Clerk Not Loading
- Check that your publishable key is correct
- Verify that your secret key matches your publishable key
- Check the browser console for any error messages

### Sign Up Not Working
- Check if sign-up is enabled in your Clerk dashboard
- Verify that the required fields are configured correctly

## Security Notes

- Never commit your `.env.local` file to version control
- Use test keys during development
- Switch to live keys only for production deployment
- Keep your secret key secure and never expose it in client-side code

## Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Next.js Integration](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk Dashboard](https://dashboard.clerk.com)
