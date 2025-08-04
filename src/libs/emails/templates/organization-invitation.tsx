import { BaseTemplate } from './base-template';

interface OrganizationInvitationProps {
  organizationName: string;
  inviteUrl: string;
  teamName: string;
}

export const OrganizationInvitation = ({
  organizationName,
  inviteUrl,
  teamName,
}: OrganizationInvitationProps) => {
  return (
    <BaseTemplate
      previewText={`You have been invited to join ${organizationName} on Klynno AI`}
      title={`You have been invited to join ${organizationName} on Klynno AI`}
    >
      <p>You have been invited to join an organization.</p>
      <p>Click the link below to create a new account:</p>
      <a href={inviteUrl}>Create an account</a>
      <p>After signing up with this email you will be automatically added to the team.</p>
    </BaseTemplate>
  );
};

export default OrganizationInvitation;
