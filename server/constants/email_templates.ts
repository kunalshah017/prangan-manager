export const EMAIL_TEMPLATES = {
  VERIFICATION_SUCCESS: {
    subject: "🎉 Account Verification - Welcome to Prangan Foundation",
    getTemplate: (data: {
      name: string;
      email: string;
      generatedPassword: string;
      status: string;
      roleAssignmentDetails: string;
    }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Verification</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 3px solid #ff8c00; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { max-width: 200px; height: auto; margin-bottom: 15px; }
        .header h1 { color: #ff8c00; margin: 0; }
        .credentials { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff8c00; }
        .credential-item { margin: 10px 0; }
        .credential-label { font-weight: bold; color: #555; }
        .credential-value { font-family: 'Courier New', monospace; background: #e9ecef; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-left: 10px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; }
        .status-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; color: white; font-weight: bold; text-transform: uppercase; }
        .status-approved { background-color: #ff8c00; }
        .status-user { background-color: #ff8c00; }
        .status-admin { background-color: #e55100; }
        .login-button { display: inline-block; background-color: #ff8c00; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; text-align: center; transition: background-color 0.3s; }
        .login-button:hover { background-color: #e67e00; }
        .button-container { text-align: center; margin: 25px 0; }
        .accent-text { color: #ff8c00; font-weight: bold; }
        .role-assignment { background: #fff8e6; border: 1px solid #ff8c00; border-radius: 8px; padding: 15px; margin: 10px 0; }
        .role-assignment h4 { color: #ff8c00; margin: 0 0 10px 0; font-size: 16px; }
        .role-assignment p { margin: 5px 0; color: #333; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://prangan-manager.vercel.app/images/logo/prangan-logo-light-mode.png" alt="Prangan Foundation Logo" class="logo" />
          <h1>🌟 Welcome to Prangan</h1>
          <p>Your account has been successfully verified!</p>
        </div>
        
        <p>Dear <strong class="accent-text">${data.name}</strong>,</p>
        
        <p>Congratulations! Your account has been <span class="accent-text">verified and activated</span>. You can now access the Prangan Manager system with your new credentials.</p>
        
        <div class="credentials">
          <h3>📋 Your Login Credentials</h3>
          <div class="credential-item">
            <span class="credential-label">📧 Email:</span>
            <span class="credential-value">${data.email}</span>
          </div>
          <div class="credential-item">
            <span class="credential-label">🔐 Password:</span>
            <span class="credential-value">${data.generatedPassword}</span>
          </div>
          <div class="credential-item">
            <span class="credential-label">📊 Status:</span>
            <span class="status-badge status-approved">${data.status}</span>
          </div>
        </div>
        
        ${data.roleAssignmentDetails}
        
        <div class="button-container">
          <a href="https://manager.pranganfoundation.org/login" class="login-button">🚀 Login to Prangan Manager</a>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff8c00;">
          <h3 style="color: #ff8c00; margin: 0 0 10px 0;">📋 Quick Login Instructions</h3>
          <p style="margin: 5px 0;">1. Click the button above to open the login page</p>
          <p style="margin: 5px 0;">2. Use your email: <strong>${data.email}</strong></p>
          <p style="margin: 5px 0;">3. Use your password: <strong>${data.generatedPassword}</strong></p>
        </div>

        <div class="footer">
          <img src="https://prangan-manager.vercel.app/images/logo/prangan-logo-light-mode.png" alt="Prangan Foundation" style="max-width: 120px; height: auto; margin-bottom: 15px;" />
          <p><strong>Prangan Foundation Team</strong></p>
          <p>📧 Email: <a href="mailto:info@pranganfoundation.org" style="color: #ff8c00;">info@pranganfoundation.org</a> | 📞 Phone: <a href="tel:+917718071289" style="color: #ff8c00;">+91-7718071289</a></p>
          <p style="color: #ff8c00; font-style: italic;"><em>Inspire | Impart | Impact</em></p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #999;">
            This is an automated email. Please do not reply to this message.<br>
            If you received this email by mistake, please ignore it.
          </p>
        </div>
      </div>
    </body>
    </html>
    `,
  },

  VERIFICATION_REJECTED: {
    subject: "❌ Account Registration - Application Status Update",
    getTemplate: (data: {
      name: string;
      email: string;
      rejectionReason: string;
    }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Registration Status</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 3px solid #dc3545; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { max-width: 200px; height: auto; margin-bottom: 15px; }
        .header h1 { color: #dc3545; margin: 0; }
        .rejection-notice { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545; }
        .rejection-reason { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; }
        .status-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; color: white; font-weight: bold; text-transform: uppercase; }
        .status-rejected { background-color: #dc3545; }
        .accent-text { color: #dc3545; font-weight: bold; }
        .contact-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff8c00; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://prangan-manager.vercel.app/images/logo/prangan-logo-light-mode.png" alt="Prangan Foundation Logo" class="logo" />
          <h1>Registration Status Update</h1>
          <p>Regarding your application to join Prangan Foundation</p>
        </div>
        
        <p>Dear <strong>${data.name}</strong>,</p>
        
        <p>Thank you for your interest in joining the Prangan Foundation team. We have carefully reviewed your registration application.</p>
        
        <div class="rejection-notice">
          <h3>📊 Application Status</h3>
          <p><strong>Status:</strong> <span class="status-badge status-rejected">REJECTED</span></p>
          <p>Unfortunately, we are unable to approve your registration at this time.</p>
        </div>
        
        <div class="rejection-reason">
          <h3>📝 Reason for Rejection</h3>
          <p><strong>Details:</strong> ${data.rejectionReason}</p>
        </div>
        
        <div class="contact-info">
          <h3>💬 Next Steps</h3>
          <p>If you believe this decision was made in error or if you would like to discuss your application further, please feel free to contact our team:</p>
          <ul>
            <li>📧 Email: <a href="mailto:info@pranganfoundation.org" style="color: #ff8c00;">info@pranganfoundation.org</a></li>
            <li>📞 Phone: <a href="tel:+917718071289" style="color: #ff8c00;">+91-7718071289</a></li>
          </ul>
          <p>You may also reapply in the future if your circumstances change or if you can address the concerns mentioned above.</p>
        </div>
        
        <p>We appreciate your understanding and wish you all the best in your future endeavors.</p>

        <div class="footer">
          <img src="https://prangan-manager.vercel.app/images/logo/prangan-logo-light-mode.png" alt="Prangan Foundation" style="max-width: 120px; height: auto; margin-bottom: 15px;" />
          <p><strong>Prangan Foundation Team</strong></p>
          <p>📧 Email: <a href="mailto:info@pranganfoundation.org" style="color: #ff8c00;">info@pranganfoundation.org</a> | 📞 Phone: <a href="tel:+917718071289" style="color: #ff8c00;">+91-7718071289</a></p>
          <p style="color: #ff8c00; font-style: italic;"><em>Inspire | Impart | Impact</em></p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #999;">
            This is an automated email. Please do not reply to this message.<br>
            If you have questions, please contact us using the information provided above.
          </p>
        </div>
      </div>
    </body>
    </html>
    `,
  },
};
