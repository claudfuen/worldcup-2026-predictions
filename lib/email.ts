// Magic-link email delivery via Resend. Falls back to logging the link to the server console
// when RESEND_API_KEY is unset, so local dev works with zero email setup.
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM || "World Cup 2026 Predictions <onboarding@resend.dev>";
const resend = apiKey ? new Resend(apiKey) : null;

export async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
  if (!resend) {
    console.log(`\n🔑 [dev] Magic link for ${email}:\n${url}\n   (set RESEND_API_KEY to send real emails)\n`);
    return;
  }
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: "Your World Cup 2026 Predictions sign-in link",
    text: `Sign in to World Cup 2026 Predictions:\n${url}\n\nThis link expires in 15 minutes. If you didn't request it, you can ignore this email.`,
    html: magicLinkHtml(url),
  });
  if (error) throw new Error(`Resend send failed: ${error.message ?? String(error)}`);
}

function magicLinkHtml(url: string): string {
  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0a0a0a">
    <p style="font-size:18px;font-weight:600;margin:0 0 4px">🏆 World Cup 2026 Predictions</p>
    <p style="color:#525252;margin:0 0 20px">Click below to sign in. This link expires in 15 minutes.</p>
    <a href="${url}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">Sign in</a>
    <p style="color:#a3a3a3;font-size:12px;margin:24px 0 0">If you didn't request this, you can safely ignore this email.</p>
  </div>`;
}
