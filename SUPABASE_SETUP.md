# Supabase Setup Guide for Klyno AI

This guide will help you set up Supabase for the Klyno AI project.

## 1. Install Dependencies

First, install the required Supabase packages:

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/auth-helpers-react
```

## 2. Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration (for future billing)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Klyno Configuration
NEXT_PUBLIC_KLYNO_BRANDING=true
NEXT_PUBLIC_BYOK_ENABLED=true

# Klyno API Keys (for default service when BYOK is disabled)
KLYNO_OPENAI_API_KEY=sk-...
KLYNO_ANTHROPIC_API_KEY=sk-ant-...
KLYNO_GOOGLE_API_KEY=...
```

## 3. Supabase Project Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your project URL and API keys from the Settings > API section
3. Update your environment variables with the actual values

## 4. Database Schema

Run the migration script in your Supabase SQL editor:

```sql
-- Copy and paste the contents of supabase/migrations/001_initial_schema.sql
-- This will create all necessary tables, indexes, and RLS policies
```

## 5. Row Level Security (RLS)

The migration script includes RLS policies that ensure:
- Users can only access their own data
- Team members can only access team data they belong to
- Proper data isolation between users and teams

## 6. Integration with Existing Code

The Supabase integration is designed to work alongside the existing LobeChat functionality:

- **Clerk Auth**: Users are automatically synced between Clerk and Supabase
- **Database Operations**: Use the `SupabaseService` class for all database operations
- **Real-time Features**: Subscribe to real-time updates for team collaboration

## 7. Usage Examples

### Creating a Team
```typescript
import { SupabaseService } from '@/services/supabase';

const team = await SupabaseService.createTeam({
  name: 'My Team',
  description: 'Team description',
  owner_id: userId,
});
```

### Real-time Message Subscription
```typescript
import { SupabaseService } from '@/services/supabase';

const subscription = SupabaseService.subscribeToConversationMessages(
  conversationId,
  (payload) => {
    console.log('New message:', payload);
  }
);
```

## 8. Next Steps

1. **Team Collaboration**: Implement team creation and management UI
2. **Usage Tracking**: Add token usage tracking and quota management
3. **Stripe Integration**: Implement subscription billing
4. **Klyno Branding**: Replace LobeHub branding with Klyno AI
5. **BYOK Feature**: Implement Bring Your Own Key functionality

## 9. Troubleshooting

### Common Issues

1. **Environment Variables Not Found**: Make sure all required environment variables are set
2. **RLS Policy Errors**: Check that users are properly authenticated and have the correct permissions
3. **Real-time Not Working**: Ensure you're subscribed to the correct channels

### Debug Mode

Enable debug mode by setting:
```env
NEXT_PUBLIC_SUPABASE_DEBUG=true
```

This will log all Supabase operations to the console.

## 10. Security Considerations

- Never expose the `SUPABASE_SERVICE_ROLE_KEY` on the client side
- Always use RLS policies to enforce data access controls
- Validate all user inputs before sending to Supabase
- Use parameterized queries to prevent SQL injection

## 11. Performance Optimization

- Use indexes for frequently queried columns
- Implement pagination for large datasets
- Use real-time subscriptions sparingly to avoid performance issues
- Cache frequently accessed data on the client side 