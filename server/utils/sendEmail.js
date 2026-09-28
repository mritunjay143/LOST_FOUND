const nodemailer = require("nodemailer");

const sendOTPEmail = async (email, otp) => {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);

  if (!user || !pass) {
    console.error("❌ ERROR: EMAIL_USER or EMAIL_PASS missing in server/.env!");
    throw new Error(
      "Email service not configured. Please set EMAIL_USER and EMAIL_PASS in server/.env to send real emails to inboxes."
    );
  }

  const transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: port === 465,
    auth: {
      user: user,
      pass: pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #374151; border-radius: 16px; background-color: #0f111a; color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #6366f1; margin-top: 10px; font-size: 24px;">Campus Lost & Found System</h2>
      </div>
      <div style="background: rgba(255,255,255,0.03); border: 1px solid #1f2937; border-radius: 12px; padding: 20px; text-align: center;">
        <h3 style="color: #f3f4f6; margin-top: 0;">Email Verification OTP</h3>
        <p style="color: #9ca3af; font-size: 14px; line-height: 1.5;">Use the 6-digit One-Time Password below to verify your email address and complete account registration:</p>
        <div style="margin: 24px 0;">
          <span style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #a855f7; background: rgba(168, 85, 247, 0.15); padding: 12px 28px; border-radius: 12px; border: 1px solid #a855f7; display: inline-block;">${otp}</span>
        </div>
        <p style="color: #9ca3af; font-size: 12px;">This code expires in 10 minutes. Do not share this OTP with anyone.</p>
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"Campus Lost & Found" <${user}>`,
    to: email,
    subject: `Your Verification Code: ${otp} - Campus Lost & Found`,
    html: htmlContent,
  });

  console.log(`✅ Real Email OTP successfully sent to inbox: ${email} (MessageId: ${info.messageId})`);
  return { success: true, messageId: info.messageId };
};

module.exports = { sendOTPEmail };
