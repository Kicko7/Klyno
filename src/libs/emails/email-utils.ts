interface OrganizationInvitationData {
  link: string;
  organization: {
    name: string;
  };
}

/**
 * Renders organization invitation email HTML using React.createElement
 * This avoids the react-dom/server import issue in Next.js
 */
export function renderOrganizationInvitationEmail(data: OrganizationInvitationData): string {
  const { link, organization } = data;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You have been invited to join ${organization.name} on Klynno AI</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f6f9fc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
    }
    .container {
      margin: 0 auto;
      max-width: 600px;
      padding: 20px 0 48px;
    }
    .logo-container {
      padding: 20px 0;
      text-align: center;
    }
    .content {
      background-color: #ffffff;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 32px;
    }
    .heading {
      color: #215350;
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 24px;
    }
    .button {
      display: inline-block;
      background-color: #215350;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 4px;
      margin: 16px 0;
    }
    .footer {
      color: #8898aa;
      font-size: 12px;
      margin-top: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-container">
      <img src="https://app.klynno.ai/logo-email.png" alt="Klynno AI" width="190" height="36" style="margin: 0 auto; padding-top: 20px;" />
    </div>
    <div class="content">
      <h1 class="heading">You have been invited to join ${organization.name} on Klynno AI</h1>
      <p>You have been invited to join an organization.</p>
      <p>Click the link below to accept the invitation:</p>
      <a href="${link}" class="button">Accept Invitation</a>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${link}</p>
      <p>This link will expire in 7 days.</p>
    </div>
    <hr style="border-color: #e6ebf1; margin: 20px 0;" />
    <div class="footer">
      <p>© 2025 Klynno AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}
