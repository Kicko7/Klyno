# Clerk-Only Authentication Changes

This document outlines the changes made to configure LobeChat to use only Clerk as the authentication provider, removing all other authentication methods including NextAuth and its SSO providers.

## Changes Made

### 1. Updated `src/config/auth.ts`
- Removed all NextAuth-related environment variable declarations
- Simplified auth configuration to only support Clerk
- Disabled NextAuth by setting `NEXT_PUBLIC_ENABLE_NEXT_AUTH` to false by default
- Removed migration warning code for deprecated environment variables

### 2. Updated `src/layout/AuthProvider/index.tsx`
- Removed NextAuth import and component usage
- Simplified logic to only check for Clerk authentication
- Falls back to NoAuth component if Clerk is not enabled

### 3. Updated `src/libs/next-auth/sso-providers/index.ts`
- Emptied the SSO providers array
- Added comment explaining that all SSO providers have been removed

### 4. Updated `src/libs/next-auth/auth.config.ts`
- Modified `initSSOProviders()` to always return an empty array
- Added comment explaining NextAuth is disabled

### 5. Updated `src/app/(backend)/api/auth/[...nextauth]/route.ts`
- Replaced NextAuth handlers with 404 responses
- Added explanatory messages that NextAuth is disabled

### 6. Updated `src/middleware.ts`
- Removed NextAuth middleware import and implementation
- Removed NextAuth route patterns from config matcher
- Removed NextAuth-specific route protection logic
- Simplified middleware export to only support Clerk or default middleware

## Environment Variables

After these changes, only the following Clerk-related environment variables are needed:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key
- `CLERK_SECRET_KEY` - Your Clerk secret key  
- `CLERK_WEBHOOK_SECRET` - Your Clerk webhook secret (optional)

## What Was Removed

All NextAuth-related authentication providers and their configurations:
- Auth0
- GitHub
- Azure AD
- Authentik
- Authelia
- Cloudflare Zero Trust
- Generic OIDC
- ZITADEL
- Logto
- Casdoor
- Microsoft Entra ID
- WeChat
- Keycloak
- Google
- Cognito

## Next Steps

1. Set up your Clerk application at https://dashboard.clerk.com/
2. Configure the required Clerk environment variables
3. Remove any NextAuth-related environment variables from your deployment
4. Test the authentication flow to ensure Clerk is working correctly

## Benefits

- Simplified authentication setup
- Reduced bundle size by removing unused NextAuth dependencies
- Cleaner codebase with single authentication provider
- Better maintenance and security with focused auth solution
