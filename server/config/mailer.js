const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send email using Resend API.
 *
 * Returns:
 *   { delivered: true, previewUrl: null }
 * or
 *   { delivered: false, previewUrl: null }
 */
async function sendMail({ to, subject, html, text }) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    if (!process.env.MAIL_FROM) {
      throw new Error("MAIL_FROM is not configured");
    }

    const { data, error } = await resend.emails.send({
      from: process.env.MAIL_FROM,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("❌ Resend email failed:", error);
      return {
        delivered: false,
        previewUrl: null,
      };
    }

    console.log(`✅ Email sent successfully via Resend: ${data.id}`);

    return {
      delivered: true,
      previewUrl: null,
    };
  } catch (error) {
    console.error("❌ Failed to send email via Resend:", error.message);

    return {
      delivered: false,
      previewUrl: null,
    };
  }
}

module.exports = { sendMail };