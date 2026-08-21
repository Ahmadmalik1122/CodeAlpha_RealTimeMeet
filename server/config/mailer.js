const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // STARTTLS on 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error("SMTP_USER / SMTP_PASS are not configured");
    }

    const transport = getTransporter();
    const info = await transport.sendMail({
      from: process.env.MAIL_FROM || `RealTimeMeet <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
    });

    console.log(`✅ Email sent via SMTP: ${info.messageId}`);
    return { delivered: true, previewUrl: null };
  } catch (err) {
    console.error("❌ SMTP email error:", err.message);
    return { delivered: false, previewUrl: null };
  }
}

module.exports = { sendMail };