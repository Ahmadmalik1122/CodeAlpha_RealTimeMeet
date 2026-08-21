const { Resend } = require("resend");

let resend = null;

function getResend() {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

async function sendMail({ to, subject, html, text }) {
  try {
    const client = getResend();
    const { data, error } = await client.emails.send({
      from: process.env.MAIL_FROM || "RealTimeMeet <onboarding@resend.dev>",
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("❌ Resend email error:", error.message || error);
      return { delivered: false, previewUrl: null };
    }

    console.log(`✅ Email sent via Resend: ${data?.id}`);
    return { delivered: true, previewUrl: null };
  } catch (err) {
    console.error("❌ Resend email error:", err.message);
    return { delivered: false, previewUrl: null };
  }
}

module.exports = { sendMail };
