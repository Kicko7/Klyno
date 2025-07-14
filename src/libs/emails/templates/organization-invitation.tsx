import { BaseTemplate } from './base-template';

export const OrganizationInvitation = ({ organizationName }: { organizationName: string }) => {
  return (
    <BaseTemplate
      previewText={`You have been invited to join ${organizationName} on Klynno AI`}
      title={`You have been invited to join ${organizationName} on Klynno AI`}
    >
      <p>You have been invited to join an organization.</p>
      <p>Click the link below to create a new account:</p>
      <a
        href={`${process.env.NEXT_PUBLIC_APP_URL}/signup?redirect_url=${encodeURIComponent(
          `${process.env.NEXT_PUBLIC_APP_URL}/teams`,
        )}`}
      >
        Create an account
      </a>
      <p>After signing up with this email you will be automatically added to the team.</p>
    </BaseTemplate>
  );
};

export default OrganizationInvitation;
