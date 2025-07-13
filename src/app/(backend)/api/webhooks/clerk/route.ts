import { NextResponse } from 'next/server';

import { authEnv } from '@/config/auth';
import { isServerMode } from '@/const/version';
import { pino } from '@/libs/logger';
import { UserService } from '@/server/services/user';
import { serverDB } from '@/database/server';
import { eq, and } from 'drizzle-orm';
import { organizations, organizationMembers, teamMembers, teamInvitations, teams } from '@/database/schemas/organization';
import { users } from '@/database/schemas/user';
import { nanoid } from 'nanoid';

import { validateRequest } from './validateRequest';

if (authEnv.NEXT_PUBLIC_ENABLE_CLERK_AUTH && isServerMode && !authEnv.CLERK_WEBHOOK_SECRET) {
  throw new Error('`CLERK_WEBHOOK_SECRET` environment variable is missing');
}

export const POST = async (req: Request): Promise<NextResponse> => {
  const payload = await validateRequest(req, authEnv.CLERK_WEBHOOK_SECRET!);

  if (!payload) {
    return NextResponse.json(
      { error: 'webhook verification failed or payload was malformed' },
      { status: 400 },
    );
  }

  const { type, data } = payload;

  pino.trace(`clerk webhook payload: ${{ data, type }}`);

  const userService = new UserService();
  switch (type) {
    case 'user.created': {
      pino.info('creating user due to clerk webhook');
      const result = await userService.createUser(data.id, data);

      return NextResponse.json(result, { status: 200 });
    }

    case 'user.deleted': {
      if (!data.id) {
        pino.warn('clerk sent a delete user request, but no user ID was included in the payload');
        return NextResponse.json({ message: 'ok' }, { status: 200 });
      }

      pino.info('delete user due to clerk webhook');

      await userService.deleteUser(data.id);

      return NextResponse.json({ message: 'user deleted' }, { status: 200 });
    }

    case 'user.updated': {
      const result = await userService.updateUser(data.id, data);

      return NextResponse.json(result, { status: 200 });
    }

    case 'organization.created': {
      pino.info('handling organization.created webhook');
      await handleOrganizationCreated(data);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    case 'organization.updated': {
      pino.info('handling organization.updated webhook');
      await handleOrganizationUpdated(data);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    case 'organization.deleted': {
      pino.info('handling organization.deleted webhook');
      await handleOrganizationDeleted(data);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    case 'organizationInvitation.accepted': {
      pino.info('handling organizationInvitation.accepted webhook');
      await handleInvitationAccepted(data);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    case 'organizationMembership.created': {
      pino.info('handling organizationMembership.created webhook');
      await handleMembershipCreated(data);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    case 'organizationMembership.updated': {
      pino.info('handling organizationMembership.updated webhook');
      await handleMembershipUpdated(data);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    case 'organizationMembership.deleted': {
      pino.info('handling organizationMembership.deleted webhook');
      await handleMembershipDeleted(data);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    case 'organizationInvitation.created':
    case 'organizationInvitation.revoked': {
      // These are handled by the invitation system
      pino.info(`handling ${type} webhook`);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    default: {
      pino.warn(
        `${req.url} received event type "${type}", but no handler is defined for this type`,
      );
      return NextResponse.json({ error: `unrecognised payload type: ${type}` }, { status: 400 });
    }
    // case 'user.updated':
    //   break;
    // case 'session.created':
    //   break;
    // case 'session.ended':
    //   break;
    // case 'session.removed':
    //   break;
    // case 'session.revoked':
    //   break;
    // case 'email.created':
    //   break;
    // case 'sms.created':
    //   break;
    // case 'organization.created':
    //   break;
    // case 'organization.updated':
    //   break;
    // case 'organization.deleted':
    //   break;
    // case 'organizationMembership.created':
    //   break;
    // case 'organizationMembership.deleted':
    //   break;
    // case 'organizationMembership.updated':
    //   break;
    // case 'organizationInvitation.accepted':
    //   break;
    // case 'organizationInvitation.created':
    //   break;
    // case 'organizationInvitation.revoked':
    //   break;
  }
};

// Organization webhook handlers
async function handleOrganizationCreated(data: any) {
  try {
    pino.info('Creating organization from Clerk webhook:', data.id);
    
    // Check if organization already exists with this Clerk ID
    const existingOrg = await serverDB.query.organizations.findFirst({
      where: eq(organizations.clerkOrgId, data.id),
    });

    if (existingOrg) {
      pino.info('Organization already exists in database:', existingOrg.id);
      return;
    }

    // Create a new organization record
    const orgId = data.public_metadata?.databaseOrgId || `org_${data.id}`;
    
    await serverDB.insert(organizations).values({
      id: orgId,
      name: data.name,
      slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
      clerkOrgId: data.id,
      ownerId: data.created_by,
      createdAt: new Date(data.created_at),
    });

    pino.info('Created organization from Clerk webhook:', orgId);

    // Add the creator as owner
    await serverDB.insert(organizationMembers).values({
      id: `om_${Date.now()}`,
      organizationId: orgId,
      userId: data.created_by,
      role: 'owner',
      permissions: {
        canInviteMembers: true,
        canManageBilling: true,
        canManageSettings: true,
        canManageTeams: true,
      },
      isActive: true,
    });

    pino.info('Added creator as owner:', data.created_by);
  } catch (error) {
    pino.error('Error handling organization creation:', error);
    throw error;
  }
}

async function handleOrganizationUpdated(data: any) {
  await serverDB
    .update(organizations)
    .set({
      name: data.name,
      slug: data.slug,
      updatedAt: new Date(),
    })
    .where(eq(organizations.clerkOrgId, data.id));
}

async function handleOrganizationDeleted(data: any) {
  await serverDB
    .delete(organizations)
    .where(eq(organizations.clerkOrgId, data.id));
}

async function handleInvitationAccepted(data: any) {
  const { organization_id, email_address, public_metadata } = data;

  // Check if this invitation has team metadata
  if (public_metadata?.teamId) {
    const { teamId, teamRole, invitationId } = public_metadata;

    // Find the user by email
    const user = await serverDB.query.users.findFirst({
      where: eq(users.email, email_address),
    });

    if (user) {
      // Add user to the team
      await serverDB.insert(teamMembers).values({
        id: 'tm_' + Date.now(),
        teamId,
        userId: user.id,
        role: teamRole || 'member',
        isActive: true,
      });

      // Update invitation status
      if (invitationId) {
        await serverDB
          .update(teamInvitations)
          .set({
            status: 'accepted',
            updatedAt: new Date(),
          })
          .where(eq(teamInvitations.id, invitationId));
      }
    }
  }

  // Also ensure user is in the organization members table
  const org = await serverDB.query.organizations.findFirst({
    where: eq(organizations.clerkOrgId, organization_id),
  });

  if (org) {
    const user = await serverDB.query.users.findFirst({
      where: eq(users.email, email_address),
    });

    if (user) {
      // Check if already a member
      const existingMember = await serverDB.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.organizationId, org.id),
          eq(organizationMembers.userId, user.id)
        ),
      });

      if (!existingMember) {
        await serverDB.insert(organizationMembers).values({
          id: 'om_' + Date.now(),
          organizationId: org.id,
          userId: user.id,
          role: 'member',
          isActive: true,
        });
      }
    }
  }
}

async function handleMembershipCreated(data: any) {
  const { organization_id, user_id, role } = data;

  // Find the organization
  const org = await serverDB.query.organizations.findFirst({
    where: eq(organizations.clerkOrgId, organization_id),
  });

  if (org) {
    // Check if already a member
    const existingMember = await serverDB.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, org.id),
        eq(organizationMembers.userId, user_id)
      ),
    });

    if (!existingMember) {
      await serverDB.insert(organizationMembers).values({
        id: 'om_' + Date.now(),
        organizationId: org.id,
        userId: user_id,
        role: role || 'member',
        isActive: true,
      });
    }
  }
}

async function handleMembershipUpdated(data: any) {
  const { organization_id, user_id, role } = data;

  // Find the organization
  const org = await serverDB.query.organizations.findFirst({
    where: eq(organizations.clerkOrgId, organization_id),
  });

  if (org) {
    await serverDB
      .update(organizationMembers)
      .set({
        role: role || 'member',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(organizationMembers.organizationId, org.id),
          eq(organizationMembers.userId, user_id)
        )
      );
  }
}

async function handleMembershipDeleted(data: any) {
  const { organization_id, user_id } = data;

  // Find the organization
  const org = await serverDB.query.organizations.findFirst({
    where: eq(organizations.clerkOrgId, organization_id),
  });

  if (org) {
    // Remove from organization members
    await serverDB
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, org.id),
          eq(organizationMembers.userId, user_id)
        )
      );

    // Also remove from all teams in this organization
    const orgTeams = await serverDB.query.teams.findMany({
      where: eq(teams.organizationId, org.id),
    });

    for (const team of orgTeams) {
      await serverDB
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, team.id),
            eq(teamMembers.userId, user_id)
          )
        );
    }
  }
}
