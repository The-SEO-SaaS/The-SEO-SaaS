/**
 * Email templates.
 *
 * Written as plain functions returning HTML strings — no template engine, no
 * React Email. Styles are inline because every major email client strips
 * <style> blocks, and the palette matches the Trust Blue design system.
 */

const BRAND = {
  primary: "#2563EB",
  accent: "#F97316",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  background: "#F8FAFC",
} as const;

/** Prevents user-supplied values (names, page titles) breaking the markup. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(options: { heading: string; body: string; preheader: string }): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:${BRAND.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;">
    <!-- Preheader: shown in the inbox preview, hidden in the body. -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(options.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.background};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border:1px solid ${BRAND.border};border-radius:12px;padding:32px;">
            <tr>
              <td>
                <p style="margin:0 0 24px;font-size:15px;font-weight:600;color:${BRAND.primary};letter-spacing:-0.01em;">TheSEOSaaS</p>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:600;color:${BRAND.text};letter-spacing:-0.02em;">${escapeHtml(options.heading)}</h1>
                ${options.body}
              </td>
            </tr>
          </table>
          <p style="max-width:520px;margin:20px auto 0;font-size:12px;line-height:1.5;color:${BRAND.muted};">
            You received this because someone entered this address at TheSEOSaaS. If it wasn't you, you can ignore it safely.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background:${BRAND.primary};color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:8px;">${escapeHtml(label)}</a>`;
}

export interface MagicLinkTemplateInput {
  url: string;
  isNewUser: boolean;
  expiresInMinutes: number;
}

export function magicLinkTemplate(input: MagicLinkTemplateInput): {
  subject: string;
  html: string;
  text: string;
} {
  const heading = input.isNewUser
    ? "Let's get your SEO moving"
    : "Sign in to TheSEOSaaS";
  const label = input.isNewUser ? "Create my account" : "Sign in";

  const html = layout({
    heading,
    preheader: `Your sign-in link expires in ${input.expiresInMinutes} minutes.`,
    body: `
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${BRAND.muted};">
        Click below to ${input.isNewUser ? "finish setting up your account" : "sign in"}. This link works once and expires in ${input.expiresInMinutes} minutes.
      </p>
      <p style="margin:0 0 24px;">${button(input.url, label)}</p>
      <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${BRAND.muted};">
        Or paste this into your browser:
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;word-break:break-all;color:${BRAND.primary};">${input.url}</p>
    `,
  });

  const text = [
    heading,
    "",
    `Use this link to ${input.isNewUser ? "finish setting up your account" : "sign in"}:`,
    input.url,
    "",
    `It works once and expires in ${input.expiresInMinutes} minutes.`,
    "If you didn't request this, you can ignore this email.",
  ].join("\n");

  return { subject: `${label} — TheSEOSaaS`, html, text };
}

export interface AuditReadyTemplateInput {
  url: string;
  domain: string;
  score: number;
  headline: string;
}

export function auditReadyTemplate(input: AuditReadyTemplateInput): {
  subject: string;
  html: string;
  text: string;
} {
  const heading = `Your SEO audit for ${input.domain} is ready`;

  const html = layout({
    heading,
    preheader: input.headline,
    body: `
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${BRAND.muted};">
        ${escapeHtml(input.headline)}
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:${BRAND.background};border-radius:8px;padding:16px 20px;">
        <tr>
          <td style="font-size:13px;color:${BRAND.muted};padding-right:16px;">SEO score</td>
          <td style="font-size:24px;font-weight:600;color:${BRAND.text};">${input.score}</td>
        </tr>
      </table>
      <p style="margin:0;">${button(input.url, "View my full audit")}</p>
    `,
  });

  const text = [
    heading,
    "",
    input.headline,
    `SEO score: ${input.score}`,
    "",
    `View your full audit: ${input.url}`,
  ].join("\n");

  return { subject: heading, html, text };
}
