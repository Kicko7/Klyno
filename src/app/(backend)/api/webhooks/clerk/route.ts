import { nanoid } from 'nanoid';
import { NextResponse } from 'next/server';

import { authEnv } from '@/config/auth';
import { isServerMode } from '@/const/version';
import { pino } from '@/libs/logger';
import { OrganizationService } from '@/server/services/organizations';
import { UserService } from '@/server/services/user';

import { validateRequest } from './validateRequest';

if (authEnv.NEXT_PUBLIC_ENABLE_CLERK_AUTH && isServerMode && !authEnv.CLERK_WEBHOOK_SECRET) {
  throw new Error('`CLERK_WEBHOOK_SECRET` environment variable is missing');
}

export const POST = async (req: Request) => {
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

      // Handle existing email invitations
      const existingInvitations = await userService.getInvitationsByEmail(
        data.email_addresses[0].email_address,
      );
      const organizationService = new OrganizationService(data.id);
      if (existingInvitations) {
        console.log('existingInvitations');
        await organizationService.acceptInvitation(existingInvitations.id);
      }

      // Handle team joining via joinCode
      const joinCode = data.unsafe_metadata?.joinCode as string;
      if (joinCode) {
        try {
          pino.info(`Processing team join with code: ${joinCode}`);
          const team = await organizationService.getTeamByJoinCode(joinCode);

          if (team) {
            // Add user to the team's organization
            await organizationService.addOrganizationMember({
              id: nanoid(),
              organizationId: team.organizationId,
              userId: data.id,
              role: 'member',
              teamIds: [team.id],
            });

            // Add user to the specific team
            await organizationService.addTeamMember({
              id: nanoid(),
              organizationId: team.organizationId,
              teamId: team.id,
              userId: data.id,
              role: 'member',
            });

            // Add user to the team's members array
            await organizationService.addUserToTeamMembersArray(team.id, data.id);

            pino.info(`User ${data.id} successfully joined team ${team.id}`);
          } else {
            pino.warn(`Invalid join code: ${joinCode}`);
          }
        } catch (error) {
          pino.error(`Error processing team join: ${error}`);
        }
      }

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
  }
};
