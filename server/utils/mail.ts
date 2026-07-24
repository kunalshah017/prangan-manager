import nodemailer from "nodemailer";

// Create transporter with environment variables
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Enable logging for debugging (remove in production)
    logger: process.env.NODE_ENV === "development",
    debug: process.env.NODE_ENV === "development",
  });
};

export const sendEmail = async (
  to: string | string[],
  subject: string,
  html: string,
  options?: {
    fromName?: string;
    messageId?: string;
    text?: string;
  },
) => {
  try {
    // Validate required environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error(
        "Email configuration missing: EMAIL_USER or EMAIL_PASS not set"
      );
      throw new Error("Email configuration incomplete");
    }

    const transporter = createTransporter();

    // Verify connection configuration
    await transporter.verify();
    console.log("📧 SMTP connection verified successfully");

    const mailOptions = {
      from: {
        name:
          options?.fromName ||
          process.env.EMAIL_FROM_NAME ||
          "Prangan Foundation",
        address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER!,
      },
      to: to,
      subject: subject,
      html: html,
      text: options?.text,
      messageId: options?.messageId,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw new Error(
      `Failed to send email: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

// Additional utility function for sending plain text emails
export const sendTextEmail = async (
  to: string | string[],
  subject: string,
  text: string
) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error(
        "Email configuration missing: EMAIL_USER or EMAIL_PASS not set"
      );
      throw new Error("Email configuration incomplete");
    }

    const transporter = createTransporter();
    await transporter.verify();

    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || "Prangan Foundation",
        address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER!,
      },
      to: to,
      subject: subject,
      text: text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Text email sent successfully:", info.messageId);

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error("❌ Error sending text email:", error);
    throw new Error(
      `Failed to send text email: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

// Test email function for debugging
export const testEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log("✅ Email connection test successful");
    return true;
  } catch (error) {
    console.error("❌ Email connection test failed:", error);
    return false;
  }
};
