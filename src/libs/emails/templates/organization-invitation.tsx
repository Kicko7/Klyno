import { BaseTemplate } from "./base-template";

export const OrganizationInvitation = ({
  invitation,
}: {
  invitation: {
      link: string;
    organization: {
      name: string;
    };
  };
}) => {
  return (
    <BaseTemplate
      previewText={`You have been invited to join ${invitation.organization.name} on Klynno AI`}
      title={`You have been invited to join ${invitation.organization.name} on Klynno AI`}
    >
      <p>You have been invited to join an organization.</p>
      <p>Click the link below to accept the invitation:</p>
      <a href={invitation.link}>{invitation.link}</a>
      <p>This link will expire in 7 days.</p>
    </BaseTemplate>
  );
};

export default OrganizationInvitation;