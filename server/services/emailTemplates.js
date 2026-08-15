/**
 * Email bodies for the verification flow.
 *
 * Deliberately written as inline-styled tables rather than with the app's
 * Tailwind classes: mail clients (Outlook especially) strip <style> blocks
 * and ignore flex/grid, so anything structural has to be table-based and
 * every rule has to live in a style attribute.
 *
 * Every template returns { subject, text, html } — the plaintext part is not
 * optional padding, it's what spam filters score against and what plaintext
 * clients render.
 */

const BRAND = "RealTime Collab";

function layout({ heading, body, ctaLabel, ctaUrl, footnote }) {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#0b1020;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b1020;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#141a2e;border:1px solid #232a44;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 0 32px;">
                <p style="margin:0;font-size:15px;font-weight:700;color:#a5b4fc;letter-spacing:0.02em;">${BRAND}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;color:#ffffff;font-weight:700;">${heading}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 32px 0 32px;">
                <p style="margin:0;font-size:14px;line-height:1.65;color:#94a3b8;">${body}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 32px 0 32px;">
                <a href="${ctaUrl}" style="display:inline-block;background-color:#6366f1;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 28px;border-radius:10px;">${ctaLabel}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0 32px;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">
                  If the button doesn't work, paste this link into your browser:<br>
                  <a href="${ctaUrl}" style="color:#818cf8;word-break:break-all;">${ctaUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px 30px 32px;">
                <hr style="border:none;border-top:1px solid #232a44;margin:0 0 16px 0;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">${footnote}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Sent right after registration, and again on every resend request. */
function verificationEmail({ fullName, verifyUrl, expiryHours }) {
  const firstName = (fullName || "there").split(" ")[0];

  return {
    subject: `Verify your email — ${BRAND}`,
    text:
      `Hi ${firstName},\n\n` +
      `Confirm your email address to activate your ${BRAND} account:\n\n` +
      `${verifyUrl}\n\n` +
      `This link expires in ${expiryHours} hours.\n\n` +
      `If you didn't create this account, you can safely ignore this email.\n`,
    html: layout({
      heading: `Hi ${firstName}, confirm your email`,
      body:
        `You're one click away from your ${BRAND} account. ` +
        `Confirm this address and you can start or join meetings right away.`,
      ctaLabel: "Verify my email",
      ctaUrl: verifyUrl,
      footnote:
        `This link expires in ${expiryHours} hours. ` +
        `If you didn't create this account, you can safely ignore this email.`,
    }),
  };
}

/** Sent once, after a successful verification — a confirmation receipt. */
function welcomeEmail({ fullName, loginUrl }) {
  const firstName = (fullName || "there").split(" ")[0];

  return {
    subject: `Your email is verified — welcome to ${BRAND}`,
    text:
      `Hi ${firstName},\n\n` +
      `Your email is verified and your ${BRAND} account is ready.\n\n` +
      `Sign in: ${loginUrl}\n`,
    html: layout({
      heading: "You're all set",
      body:
        `Your email is verified and your ${BRAND} account is ready to use. ` +
        `Sign in and start your first meeting.`,
      ctaLabel: "Sign in",
      ctaUrl: loginUrl,
      footnote: "You're receiving this because you just verified your email address.",
    }),
  };
}

/** Sent when a user requests a password reset link. */
function passwordResetEmail({ fullName, resetUrl, expiryMinutes }) {
  const firstName = (fullName || "there").split(" ")[0];

  return {
    subject: `Reset your password — ${BRAND}`,
    text:
      `Hi ${firstName},\n\n` +
      `We received a request to reset the password on your ${BRAND} account.\n\n` +
      `Choose a new password here:\n\n` +
      `${resetUrl}\n\n` +
      `This link expires in ${expiryMinutes} minutes and can only be used once.\n\n` +
      `If you didn't request this, you can safely ignore this email — your ` +
      `password will not change.\n`,
    html: layout({
      heading: `Hi ${firstName}, reset your password`,
      body:
        `We received a request to reset the password on your ${BRAND} account. ` +
        `Click below to choose a new one.`,
      ctaLabel: "Reset my password",
      ctaUrl: resetUrl,
      footnote:
        `This link expires in ${expiryMinutes} minutes and can only be used once. ` +
        `If you didn't request a password reset, you can safely ignore this email — ` +
        `your password will not change.`,
    }),
  };
}

/**
 * Sent after a password is actually changed — a security receipt.
 *
 * Worth sending even though the user just did this themselves: if the reset
 * wasn't them, this is the only signal they'd get that their account was
 * taken over, and it arrives while they can still act on it.
 */
function passwordChangedEmail({ fullName, loginUrl }) {
  const firstName = (fullName || "there").split(" ")[0];

  return {
    subject: `Your password was changed — ${BRAND}`,
    text:
      `Hi ${firstName},\n\n` +
      `Your ${BRAND} password was just changed.\n\n` +
      `Sign in: ${loginUrl}\n\n` +
      `If this wasn't you, reset your password immediately and contact support.\n`,
    html: layout({
      heading: "Your password was changed",
      body:
        `Your ${BRAND} password was just changed. You can now sign in with ` +
        `your new password.`,
      ctaLabel: "Sign in",
      ctaUrl: loginUrl,
      footnote:
        "If you didn't make this change, reset your password immediately and " +
        "contact support.",
    }),
  };
}

/**
 * Sent to the admin inbox (SMTP_USER) whenever a user submits feedback.
 *
 * Not built on layout() — there's no CTA link here, just a plain summary
 * table of what was submitted. Kept in the same dark/brand visual style as
 * the other templates for consistency, but its own small helper since the
 * shape (label/value rows, no button) doesn't fit layout()'s signature.
 */
function feedbackNotificationEmail({ fullName, email, rating, category, message, submittedAt }) {
  const row = (label, value) => `
              <tr>
                <td style="padding:14px 32px 0 32px;">
                  <p style="margin:0;font-size:12px;font-weight:700;color:#a5b4fc;letter-spacing:0.02em;text-transform:uppercase;">${label}</p>
                  <p style="margin:4px 0 0 0;font-size:14px;line-height:1.6;color:#e2e8f0;white-space:pre-wrap;">${value}</p>
                </td>
              </tr>`;

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#0b1020;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b1020;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#141a2e;border:1px solid #232a44;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 0 32px;">
                <p style="margin:0;font-size:15px;font-weight:700;color:#a5b4fc;letter-spacing:0.02em;">${BRAND}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;color:#ffffff;font-weight:700;">New Feedback</h1>
              </td>
            </tr>
            ${row("Name", fullName || "Unknown")}
            ${row("Email", email || "Unknown")}
            ${row("Rating", `${rating} / 5`)}
            ${row("Category", category)}
            ${row("Feedback", message)}
            ${row("Submitted", submittedAt)}
            <tr>
              <td style="padding:22px 32px 30px 32px;">
                <hr style="border:none;border-top:1px solid #232a44;margin:0 0 16px 0;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">Automated notification from ${BRAND} feedback system.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text =
    `New Feedback - ${BRAND}\n\n` +
    `Name:\n${fullName || "Unknown"}\n\n` +
    `Email:\n${email || "Unknown"}\n\n` +
    `Rating:\n${rating}\n\n` +
    `Category:\n${category}\n\n` +
    `Feedback:\n${message}\n\n` +
    `Submitted:\n${submittedAt}\n`;

  return {
    subject: "New Feedback - RealTimeMeet",
    text,
    html,
  };
}

module.exports = {
  verificationEmail,
  welcomeEmail,
  passwordResetEmail,
  passwordChangedEmail,
  feedbackNotificationEmail,
};
