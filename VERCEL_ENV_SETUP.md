# Vercel Environment Variables Setup for Klyno AI

all the required environment variables in Vercel for the Klyno AI project.

## Required Environment Variables

### Supabase Configuration

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Clerk Authentication

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### AI Provider API Keys (Optional - for BYOK functionality)

```
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key
MISTRAL_API_KEY=your_mistral_api_key
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
```

### Other Required Variables

```
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-domain.vercel.app
```

## How to Set Environment Variables in Vercel

### Method 1: Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable with the appropriate scope:
   - **Production**: For production deployments
   - **Preview**: For preview deployments (optional)
   - **Development**: For local development (optional)

### Method 2: Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... repeat for all variables
```

## Environment Variable Sources

### Supabase Variables

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the following values:
   - **Project URL**: Use as `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public**: Use as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret**: Use as `SUPABASE_SERVICE_ROLE_KEY`

### Clerk Variables

1. Go to your Clerk dashboard
2. Navigate to **API Keys**
3. Copy the following values:
   - **Publishable Key**: Use as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret Key**: Use as `CLERK_SECRET_KEY`

### AI Provider Keys

- **OpenAI**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Anthropic**: Get from [Anthropic Console](https://console.anthropic.com/)
- **Google**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Mistral**: Get from [Mistral AI Platform](https://console.mistral.ai/)
- **Azure OpenAI**: Get from your Azure OpenAI resource

## Security Notes

1. **Never commit API keys to your repository**
2. **Use different keys for development and production**
3. **Rotate keys regularly**
4. **Use the minimum required permissions for each key**

## Verification

After setting up the environment variables:

1. **Redeploy your application** in Vercel
2. **Test the Supabase connection** by visiting `/api/supabase/test`
3. **Test authentication** by trying to sign in/sign up
4. **Test AI functionality** by starting a conversation

## Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables"**

   - Ensure all Supabase variables are set correctly
   - Check that the project URL and keys match your Supabase project

2. **"Clerk authentication not working"**

   - Verify Clerk keys are correct
   - Ensure the domain is added to Clerk's allowed origins

3. **"AI providers not working"**
   - Check that API keys are valid and have sufficient credits
   - Verify the keys are set for the correct environment (Production/Preview)

### Support

If you encounter issues:

1. Check the Vercel build logs for specific error messages
2. Verify all environment variables are set correctly
3. Test the API endpoints individually
4. Check the browser console for client-side errors
