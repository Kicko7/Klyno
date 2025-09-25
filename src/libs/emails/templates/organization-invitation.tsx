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
      previewText={`You have been invited to join ${organizationName} on Klyno AI`}
      title={`You have been invited to join ${organizationName} on Klyno AI`}
    >
      <p>
        You have been invited to join <strong>{organizationName}</strong> on Klyno AI.
      </p>
      <p>
        If you already have an account, clicking the link below will add you to the organization. If
        you don't have an account yet, you'll be prompted to create one.
      </p>
      <a
        href={inviteUrl}
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          margin: '20px 0',
          backgroundColor: '#1677ff',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '6px',
        }}
      >
        Accept Invitation
      </a>
      <p>
        This invitation link will expire in 7 days. If you have any issues, please contact the
        organization administrator.
      </p>
    </BaseTemplate>
  );
};

export default OrganizationInvitation;
