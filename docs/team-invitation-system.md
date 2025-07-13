# Team Member Invitation System

## Overview

The team member invitation system in LobeChat allows team leaders and moderators to add new members to their teams by email address. This system is integrated with Clerk authentication to ensure secure user management.

## How It Works

### Prerequisites
- The inviting user must be a team leader or moderator
- The invited user must have an existing LobeChat account (registered through Clerk)
- The invited user's email must match their registered account email

### Invitation Flow

1. **User Initiates Invitation**
   - Team leader/moderator clicks the "Add Member" button in the team interface
   - A modal dialog opens with an invitation form

2. **Email Validation**
   - User enters the email address of the person they want to invite
   - Selects the role for the new member (Member, Moderator, or Leader)
   - Submits the form

3. **Backend Processing**
   - System searches for a user with the provided email in the database
   - If user exists: adds them to the team with the specified role
   - If user doesn't exist: returns an error message

4. **Success/Error Handling**
   - On success: Member is added immediately and appears in the team member list
   - On error: User sees appropriate error message

### Technical Implementation

#### Frontend Components
- **Client.tsx**: Main team interface component
  - Contains the invitation modal and form
  - Handles form submission and error display
  - Updates member list on successful invitation

#### Backend Services
- **OrganizationRouter**: TRPC endpoint for invitation
  - `inviteTeamMember`: Accepts email, role, and teamId
  
- **OrganizationService**: Business logic layer
  - `inviteTeamMember`: Coordinates the invitation process
  
- **OrganizationModel**: Database layer
  - `inviteTeamMemberByEmail`: Performs database operations
  - Checks for existing users and team membership
  - Creates new team member records

#### Store Management
- **TeamStore**: Zustand store for team state
  - `inviteMember`: Calls the backend API and refreshes member list

### Error Messages

1. **User Not Found**
   - Message: "User not found. The user must sign up for an account first before they can be added to a team."
   - Cause: No user exists with the provided email address

2. **Already a Member**
   - Message: "User is already a member of this team"
   - Cause: The user has already been added to this team

### Security Considerations

1. **Authentication Required**
   - All invitation endpoints require authenticated users
   - User must have appropriate permissions in the team

2. **Email Privacy**
   - Email addresses are only used for user lookup
   - No emails are sent automatically (users must sign up independently)

3. **Role-Based Access**
   - Only team leaders and moderators can invite new members
   - Role hierarchy is enforced at the database level

## Future Enhancements

### Email Invitations
Currently, users must have an account before being invited. Future enhancements could include:
- Sending invitation emails to non-registered users
- Creating invitation links with temporary tokens
- Automatic team joining upon registration with invitation token

### Clerk Integration
- Using Clerk's invitation API for sending emails
- Syncing Clerk organization membership with team membership
- Supporting Clerk's built-in invitation workflows

### Bulk Invitations
- CSV import for multiple users
- Copy/paste multiple email addresses
- Role assignment for bulk invitations

## Usage Example

```typescript
// In your React component
const { inviteMember } = useTeamStore();

const handleInvite = async (email: string, role: 'member' | 'moderator' | 'leader') => {
  try {
    await inviteMember(teamId, email, role);
    message.success('Member invited successfully');
  } catch (error) {
    message.error(error.message);
  }
};
```

## API Reference

### TRPC Endpoint
```typescript
inviteTeamMember: organizationProcedure
  .input(
    z.object({
      email: z.string().email(),
      role: z.enum(['leader', 'moderator', 'member']),
      teamId: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return ctx.organizationService.inviteTeamMember(input);
  })
```

### Database Schema
The system uses the following tables:
- `users`: Stores user information including email
- `teams`: Stores team information
- `teamMembers`: Junction table linking users to teams with roles
