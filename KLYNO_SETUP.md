# Klyno AI Setup Guide

## 🚀 Quick Start

### 1. Environment Variables Setup

Create a `.env.local` file in your project root with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://mftvddarsfotetczgjoy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Stripe Configuration (for future billing)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Klyno Configuration
NEXT_PUBLIC_KLYNO_BRANDING=true
NEXT_PUBLIC_KLYNO_VERSION=1.0.0
```

### 2. Get Your Supabase Keys

1. Go to your Supabase project: https://supabase.com/dashboard/project/mftvddarsfotetczgjoy
2. Navigate to Settings → API
3. Copy the following keys:
   - **Project URL**: `https://mftvddarsfotetczgjoy.supabase.co` (already provided)
   - **anon/public key**: Copy this to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key**: Copy this to `SUPABASE_SERVICE_ROLE_KEY`

### 3. Run Database Migration

After setting up your environment variables, run the database migration:

```bash
npm run db:migrate
```

### 4. Start Development Server

```bash
npm run dev
```

## 📋 What's Been Implemented

### ✅ Supabase Integration
- **Client Configuration**: `src/lib/supabase.ts`
- **Type Definitions**: `src/types/supabase.ts`
- **Database Adapter**: `src/database/core/supabase.ts`
- **Service Layer**: `src/services/supabase/index.ts`
- **React Hooks**: `src/hooks/useSupabase.ts`
- **Provider**: `src/providers/SupabaseProvider.tsx`
- **Database Schema**: `supabase/migrations/001_initial_schema.sql`

### ✅ Database Schema
The migration includes tables for:
- **Users**: Extended user profiles with subscription info
- **Teams**: Team management and collaboration
- **Workspaces**: Shared workspaces for teams
- **Conversations**: Chat conversations
- **Messages**: Individual chat messages
- **Usage Tracking**: Token usage and billing
- **Prompt Templates**: Shared prompts for teams

### ✅ Environment Configuration
- Updated `src/envs/app.ts` with Supabase variables
- Added Klyno-specific configuration options

## 🔧 Next Steps

1. **Get your Supabase keys** and add them to `.env.local`
2. **Run the database migration** to create all tables
3. **Test the integration** by visiting `/api/supabase/test`
4. **Start building team features** using the provided hooks and services

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Run database migration
npm run db:migrate

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

## 📁 File Structure

```
src/
├── lib/
│   └── supabase.ts              # Supabase client configuration
├── types/
│   └── supabase.ts              # Database type definitions
├── database/
│   └── core/
│       └── supabase.ts          # Database adapter
├── services/
│   └── supabase/
│       └── index.ts             # Business logic services
├── hooks/
│   └── useSupabase.ts           # React hooks for Supabase
├── providers/
│   └── SupabaseProvider.tsx     # React context provider
└── app/
    └── api/
        └── supabase/
            └── test/
                └── route.ts     # Test API endpoint

supabase/
└── migrations/
    └── 001_initial_schema.sql   # Database schema
```

## 🔒 Security Notes

- Never commit your `.env.local` file
- Keep your service role key secure
- Use Row Level Security (RLS) policies in Supabase
- Implement proper authentication checks

## 🆘 Troubleshooting

### Common Issues

1. **Environment variables not loading**: Make sure `.env.local` is in the project root
2. **Database connection errors**: Verify your Supabase keys are correct
3. **Migration failures**: Check that your service role key has proper permissions

### Getting Help

- Check the Supabase dashboard for connection status
- Review the test endpoint at `/api/supabase/test`
- Check browser console for client-side errors
- Review server logs for API errors 