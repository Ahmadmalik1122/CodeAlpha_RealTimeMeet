const { Resend } = require("resend");

let resendClient = null;

function getResendClient() {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}

async function sendMail({ to, subject, html, text }) {
  try {
    const resend = getResendClient();

    const { data, error } = await resend.emails.send({
      from:
        process.env.MAIL_FROM ||
        "RealTimeMeet <onboarding@resend.dev>",
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
    console.error("❌ Resend email error:", error.message);

    return {
      delivered: false,
      previewUrl: null,
    };
  }
}

module.exports = { sendMail };