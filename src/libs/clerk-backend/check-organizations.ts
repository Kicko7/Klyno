import { clerkBackend } from './index';

let organizationsEnabled: boolean | null = null;

export async function checkClerkOrganizationsEnabled(): Promise<boolean> {
  // Cache the result
  if (organizationsEnabled !== null) {
    return organizationsEnabled;
  }

  try {
    // Try to list organizations - if this works, organizations are enabled
    await clerkBackend.organizations.getOrganizationList({
      limit: 1,
    });
    organizationsEnabled = true;
    console.log('✅ Clerk Organizations are enabled');
    return true;
  } catch (error: any) {
    if (error.status === 403 || error.status === 404) {
      organizationsEnabled = false;
      console.warn(
        '⚠️ Clerk Organizations are not enabled. Please enable Organizations in your Clerk dashboard at https://dashboard.clerk.com'
      );
      return false;
    }
    // For other errors, we can't determine the status
    console.error('Failed to check Clerk Organizations status:', error);
    return false;
  }
}
