import { UserJSON } from '@clerk/backend';

import { pino } from '@/libs/logger';
import { SupabaseService } from '@/services/supabase';

export class UserService {
  createUser = async (id: string, params: UserJSON) => {
    pino.info(`[UserService] Creating or syncing user: ${id}`);
    try {
      await SupabaseService.syncUserWithClerk({
        createdAt: params.created_at,
        emailAddresses: params.email_addresses,
        firstName: params.first_name,
        id,
        imageUrl: params.image_url,
        lastName: params.last_name,
        phoneNumbers: params.phone_numbers,
        primaryEmailAddressId: params.primary_email_address_id,
        primaryPhoneNumberId: params.primary_phone_number_id,
        username: params.username,
      });

      // The original service created an "inbox" agent. We can revisit this feature later.
      // For now, ensuring the user is in the DB is the priority.

      return { message: 'User synced successfully', success: true };
    } catch (error) {
      pino.error({ error }, `[UserService] Error syncing user ${id}`);
      return {
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        success: false,
      };
    }
  };

  deleteUser = async (id: string) => {
    pino.info(`[UserService] Deleting user: ${id}`);
    try {
      await SupabaseService.deleteUser(id);
      return { message: 'User deleted successfully', success: true };
    } catch (error) {
      pino.error({ error }, `[UserService] Error deleting user ${id}`);
      return {
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        success: false,
      };
    }
  };

  updateUser = async (id: string, params: UserJSON) => {
    // The `createUser` logic now handles both creation and updates (syncing).
    // We can just call it directly.
    pino.info(`[UserService] Updating user: ${id}`);
    return this.createUser(id, params);
  };

  getUserAvatar = async (userId: string, imageName: string) => {
    pino.info(`[UserService] Getting user avatar: ${userId}, ${imageName}`);
    try {
      // This would typically fetch from a file storage service
      // For now, return null to indicate not found
      return null;
    } catch (error) {
      pino.error({ error }, `[UserService] Error getting user avatar ${userId}`);
      return null;
    }
  };
}
