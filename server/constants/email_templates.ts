export const EMAIL_TEMPLATES = {
  VERIFICATION_SUCCESS: {
    subject: "🎉 Account Verification - Welcome to Prangan Foundation",
    getTemplate: (data: {
      name: string;
      email: string;
      activationUrl: string;
      roleAssignmentDetails: string;
    }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Verification</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; line-height: 1.55; color: #172033; margin: 0; padding: 24px 12px; background-color: #f3f6f8; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 12px; box-shadow: 0 8px 24px rgba(23,32,51,0.10); }
        .header { text-align: center; border-bottom: 3px solid #ea7a18; padding-bottom: 20px; margin-bottom: 28px; }
        .logo { max-width: 200px; height: auto; margin-bottom: 15px; }
        .header h1 { color: #172033; margin: 0; }
        .credentials { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ea7a18; }
        .credential-item { margin: 10px 0; }
        .credential-label { font-weight: bold; color: #555; }
        .credential-value { font-family: 'Courier New', monospace; background: #e9ecef; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-left: 10px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; }
        .status-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; color: white; font-weight: bold; text-transform: uppercase; }
        .status-approved { background-color: #ff8c00; }
        .status-user { background-color: #ff8c00; }
        .status-admin { background-color: #e55100; }
        .login-button { display: inline-block; background-color: #b94e00; color: #ffffff !important; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; text-align: center; }
        .login-button:hover { background-color: #933e00; }
        .button-container { text-align: center; margin: 25px 0; }
        .accent-text { color: #ff8c00; font-weight: bold; }
        .role-assignment { background: #fff8f0; border: 1px solid #f5bf8f; border-radius: 8px; padding: 15px; margin: 10px 0; }
        .role-assignment h4 { color: #8a3800; margin: 0 0 10px 0; font-size: 16px; }
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
        
        <p>Congratulations! Your account has been <span class="accent-text">approved</span>. Set a password to activate it.</p>
        
        <div class="credentials">
          <h3>📋 Your Account</h3>
          <div class="credential-item">
            <span class="credential-label">📧 Email:</span>
            <span class="credential-value">${data.email}</span>
          </div>
        </div>
        
        ${data.roleAssignmentDetails}
        
        <div class="button-container">
          <a href="${data.activationUrl}" class="login-button">Set your password</a>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff8c00;">
          <h3 style="color: #ff8c00; margin: 0 0 10px 0;">📋 Next steps</h3>
          <p style="margin: 5px 0;">1. Click the button above to set your password.</p>
          <p style="margin: 5px 0;">2. Sign in with your email: <strong>${data.email}</strong>.</p>
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

  PASSWORD_RESET: {
    getTemplate: (data: { name: string; resetUrl: string }) => `
      <!DOCTYPE html><html><body style="margin:0;padding:24px 12px;background:#f3f6f8;color:#172033;font-family:Arial,Helvetica,sans-serif;line-height:1.55">
        <main style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 8px 24px rgba(23,32,51,.10)">
          <img src="https://prangan-manager.vercel.app/images/logo/prangan-logo-light-mode.png" alt="Prangan Foundation" style="display:block;max-width:150px;height:auto;margin:0 auto 24px" />
          <h1 style="margin:0 0 12px;font-size:24px;color:#172033">Reset your password</h1>
          <p>Hello ${data.name},</p><p>We received a request to reset your Prangan password. Use the secure, one-time link below to choose a new password.</p>
          <p style="margin:28px 0"><a href="${data.resetUrl}" style="display:inline-block;border-radius:6px;background:#b94e00;color:#fff !important;padding:14px 24px;text-decoration:none;font-weight:700">Reset password</a></p>
          <p style="padding:14px 16px;background:#f8fafc;border-left:4px solid #ea7a18">If you did not request this, you can safely ignore this email. Your password will not change.</p>
          <p style="margin:24px 0 0;color:#5d6675;font-size:13px">Prangan Foundation · This is an automated security email.</p>
        </main></body></html>`,
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
        body { font-family: Arial, Helvetica, sans-serif; line-height: 1.55; color: #172033; margin: 0; padding: 24px 12px; background-color: #f3f6f8; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 12px; box-shadow: 0 8px 24px rgba(23,32,51,0.10); }
        .header { text-align: center; border-bottom: 3px solid #c7333d; padding-bottom: 20px; margin-bottom: 28px; }
        .logo { max-width: 200px; height: auto; margin-bottom: 15px; }
        .header h1 { color: #172033; margin: 0; }
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
