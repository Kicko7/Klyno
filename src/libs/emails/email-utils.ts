interface OrganizationInvitationData {
  link: string;
  organization: {
    name: string;
  };
}

interface WithdrawalRequestData {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  affiliateInfo: {
    totalRevenue: number;
    totalClicks: number;
    totalSignups: number;
    link: string;
  };
  withdrawalAmount: number;
  markAsPaidLink: string;
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
  <title>You have been invited to join ${organization.name} on Klyno AI</title>
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
      <img src="https://app.klynno.ai/logo-email.png" alt="Klyno AI" width="190" height="36" style="margin: 0 auto; padding-top: 20px;" />
    </div>
    <div class="content">
      <h1 class="heading">You have been invited to join ${organization.name} on Klyno AI</h1>
      <p>You have been invited to join an organization.</p>
      <p>Click the link below to accept the invitation:</p>
      <a href="${link}" class="button">Accept Invitation</a>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${link}</p>
      <p>This link will expire in 7 days.</p>
    </div>
    <hr style="border-color: #e6ebf1; margin: 20px 0;" />
    <div class="footer">
      <p>© 2025 Klyno AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Renders withdrawal request email HTML for admin
 */
export function renderWithdrawalRequestEmail(data: WithdrawalRequestData): string {
  const { user, affiliateInfo, withdrawalAmount, markAsPaidLink } = data;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Affiliate Withdrawal Request - Klyno AI</title>
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
    .alert {
      background-color: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 4px;
      padding: 16px;
      margin: 16px 0;
    }
    .alert-text {
      color: #92400e;
      font-weight: 600;
    }
    .info-section {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 20px;
      margin: 16px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #374151;
    }
    .info-value {
      color: #6b7280;
    }
    .amount-highlight {
      background-color: #10b981;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: 600;
    }
    .button {
      display: inline-block;
      background-color: #10b981;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 4px;
      margin: 16px 0;
      font-weight: 600;
    }
    .button:hover {
      background-color: #059669;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 16px;
      margin: 16px 0;
    }
    .stat-card {
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 16px;
      text-align: center;
    }
    .stat-value {
      font-size: 20px;
      font-weight: 600;
      color: #215350;
    }
    .stat-label {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
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
      <img src="https://app.klynno.ai/logo-email.png" alt="Klyno AI" width="190" height="36" style="margin: 0 auto; padding-top: 20px;" />
    </div>
    <div class="content">
      <h1 class="heading">💰 New Affiliate Withdrawal Request</h1>
      
      <div class="alert">
        <p class="alert-text">A user has requested a withdrawal from their affiliate earnings.</p>
      </div>

      <div class="info-section">
        <h3 style="margin-top: 0; color: #215350;">User Information</h3>
        <div class="info-row">
          <span class="info-label">User ID:</span>
          <span class="info-value">${user.id}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value">${user.email}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Name:</span>
          <span class="info-value">${user.name || 'Not provided'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Affiliate Link:</span>
          <span class="info-value" style="word-break: break-all;">${affiliateInfo.link}</span>
        </div>
      </div>

      <div class="info-section">
        <h3 style="margin-top: 0; color: #215350;">Withdrawal Details</h3>
        <div class="info-row">
          <span class="info-label">Requested Amount:</span>
          <span class="info-value"><span class="amount-highlight">$${withdrawalAmount.toFixed(2)}</span></span>
        </div>
        <div class="info-row">
          <span class="info-label">Total Earnings:</span>
          <span class="info-value">$${affiliateInfo.totalRevenue.toFixed(2)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Request Date:</span>
          <span class="info-value">${new Date().toLocaleDateString()}</span>
        </div>
      </div>

      <div class="info-section">
        <h3 style="margin-top: 0; color: #215350;">Affiliate Performance</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${affiliateInfo.totalClicks}</div>
            <div class="stat-label">Total Clicks</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${affiliateInfo.totalSignups}</div>
            <div class="stat-label">Total Signups</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">$${affiliateInfo.totalRevenue.toFixed(2)}</div>
            <div class="stat-label">Total Revenue</div>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${markAsPaidLink}" class="button">✅ Mark as Paid</a>
      </div>

      <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
        <strong>Next Steps:</strong><br>
        1. Verify the user's identity and payment method<br>
        2. Process the payment via PayPal or bank transfer<br>
        3. Click "Mark as Paid" to update the system<br>
        4. Send confirmation email to the user
      </p>
    </div>
    <hr style="border-color: #e6ebf1; margin: 20px 0;" />
    <div class="footer">
      <p>© 2025 Klyno AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}
