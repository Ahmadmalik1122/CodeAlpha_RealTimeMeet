const nodemailer = require("nodemailer");

/**
 * Mail transport.
 *
 * Two modes, chosen by whether SMTP_HOST is set in .env:
 *
 *   1. Configured  — real SMTP (Gmail app password, Mailtrap, SendGrid, SES…).
 *   2. Unconfigured — falls back to a throwaway Ethereal inbox created on the
 *      fly. Nothing is actually delivered; instead the console prints a
 *      preview URL where you can read the message in a browser. This means a
 *      teammate can clone the repo and exercise the whole verification flow
 *      without provisioning any mail credentials.
 *
 * The transporter is created lazily and cached, because the Ethereal path
 * needs an await (it calls out to create the test account) and we don't want
 * to pay that cost — or crash at import time — for a server that may never
 * send an email.
 */

let cachedTransporter = null;
let usingEthereal = false;

async function buildTransporter() {
  if (process.env.SMTP_HOST) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      // Port 465 is implicit TLS; 587 upgrades via STARTTLS.
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // One-time startup check so a bad App Password / auth config shows up
    // immediately in the logs, instead of only surfacing later inside a
    // sendMail() catch block the first time someone happens to trigger an
    // email. Never log the credentials themselves — only the host/user
    // (identifying, not secret) and the error's own message/code.
    try {
      await transporter.verify();
      console.log(
        `✅ SMTP ready — connected to ${process.env.SMTP_HOST} as ${process.env.SMTP_USER || "(no SMTP_USER set)"}.`
      );
    } catch (error) {
      console.error(
        `❌ SMTP verification failed for ${process.env.SMTP_HOST} (user: ${process.env.SMTP_USER || "(no SMTP_USER set)"}): ` +
          `${error.code || error.name || "Error"} — ${error.message}`
      );
      console.error(
        "   Check SMTP_HOST/SMTP_PORT/SMTP_USER, and that SMTP_PASS is a valid 16-character " +
          "Gmail App Password (Google Account > Security > 2-Step Verification > App Passwords) " +
          "with 2FA enabled on that account."
      );
    }

    return transporter;
  }

  // ---- Dev fallback -------------------------------------------------------
  const testAccount = await nodemailer.createTestAccount();
  usingEthereal = true;

  console.warn(
    "\n⚠️  SMTP_HOST is not set — falling back to an Ethereal test inbox.\n" +
      "   Verification emails will NOT be delivered to real addresses.\n" +
      "   Each send prints a preview URL you can open in the browser.\n"
  );

  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

async function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = await buildTransporter();
  }
  return cachedTransporter;
}

/**
 * Send one email.
 *
 * Resolves to { delivered, previewUrl }. Note that it RESOLVES rather than
 * rejects on SMTP failure: callers (registration, resend) treat a mail
 * outage as non-fatal — the account is already created and the user can hit
 * "resend" — so a dead SMTP box must not turn into a 500 that makes
 * registration look broken.
 */
async function sendMail({ to, subject, html, text }) {
  try {
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || '"RealTime Collab" <no-reply@realtimecollab.app>',
      to,
      subject,
      text,
      html,
    });

    const previewUrl = usingEthereal ? nodemailer.getTestMessageUrl(info) : null;

    if (previewUrl) {
      console.log(`📧 Verification email preview: ${previewUrl}`);
    }

    return { delivered: true, previewUrl };
  } catch (error) {
    console.error("❌ Failed to send email:", error.message);
    return { delivered: false, previewUrl: null };
  }
}

module.exports = { sendMail };
