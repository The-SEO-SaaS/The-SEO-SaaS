import { env } from "@theseosaas/env/server";

/**
 * Brand assets and chrome for email.
 *
 * The previous templates were built on a "Trust Blue" palette — #2563EB
 * primary, #F97316 accent — that appears nowhere in the product. Someone who
 * ran an audit on a near-black site and then received a blue email had no
 * reason to connect the two, which is the one job brand consistency does in a
 * transactional inbox.
 *
 * Every value here is taken from the real design system: `packages/ui`'s
 * `--ink-900` and friends, and the semantic colours the audit report already
 * uses for good/warning states. Change them here and every email follows.
 *
 * Deliberately no build step and no React Email. Email HTML is a different,
 * worse language than web HTML — tables for layout, inline styles only, no
 * flexbox, no `gap`, no CSS variables — and pretending otherwise with a
 * component abstraction produces markup that renders correctly in a preview
 * pane and falls apart in Outlook.
 */

export const BRAND = {
  /** The product's near-black. Buttons, headings, the wordmark tile. */
  ink: "#0B1220",
  inkSoft: "#1E2635",
  text: "#0B1220",
  muted: "#5B6472",
  subtle: "#6B7480",
  faint: "#9AA6B8",
  border: "#E2E6EC",
  rule: "#EDEFF3",
  background: "#FAFBFC",
  white: "#FFFFFF",
  /** Semantic, matching the report's own score colours. */
  good: "#15803D",
  goodSoft: "#EAF7EF",
  warn: "#B45309",
  warnSoft: "#FEF3E7",
  bad: "#B91C1C",
  badSoft: "#FEF2F2",
} as const;

/**
 * The system stack, not a webfont.
 *
 * Instrument Sans and Inter are loaded via `next/font` on the web. Neither is
 * available in an email client, and `@import`ing a webfont in email is blocked
 * by most of them and is a privacy leak in the rest. The system stack is what
 * actually renders.
 */
export const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif";

/** Absolute, because email clients have no origin to resolve against. */
function assetUrl(path: string): string {
  return `${env.APP_URL.replace(/\/$/, "")}${path}`;
}

export const LOGO_URL = assetUrl("/web-app-manifest-192x192.png");
export const SITE_URL = env.APP_URL.replace(/\/$/, "");

/** Prevents user-supplied values (domains, page titles) breaking the markup. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Masthead.
 *
 * The real logo file rather than a coloured square: it's the same asset the
 * site serves as its icon, so an inbox with images enabled shows the mark the
 * user just saw in the browser tab.
 *
 * `alt` carries the wordmark so the header still reads as the brand when images
 * are blocked, which is the default in Outlook and Gmail for a first-time
 * sender — the case where recognition matters most.
 */
export function header(): string {
  return `
    <tr>
      <td style="padding:28px 32px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-right:10px;vertical-align:middle;">
              <img src="${LOGO_URL}" width="28" height="28" alt="TheSEOSaaS"
                   style="display:block;width:28px;height:28px;border-radius:8px;border:0;" />
            </td>
            <td style="vertical-align:middle;">
              <span style="font-family:${FONT};font-size:16px;font-weight:600;color:${BRAND.ink};letter-spacing:-0.03em;">TheSEOSaaS</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

/**
 * Footer.
 *
 * Carries the product's own line — the same one on the website footer — then
 * the legal minimum. `List-Unsubscribe` headers can't be set per-template, so
 * the plain-language "you received this because" note is doing that work; it's
 * also what keeps a transactional send out of a spam folder when a recipient
 * doesn't recognise the sender.
 */
export function footer(): string {
  return `
    <tr>
      <td style="padding:0 32px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="border-top:1px solid ${BRAND.rule};padding-top:20px;">
              <p style="margin:0 0 12px;font-family:${FONT};font-size:13px;line-height:1.55;color:${BRAND.muted};">
                The audit tells you what to do. The tool does it with you.
              </p>
              <p style="margin:0 0 14px;font-family:${FONT};font-size:12px;line-height:1.6;">
                <a href="${SITE_URL}" style="color:${BRAND.subtle};text-decoration:none;">Home</a>
                <span style="color:${BRAND.border};">&nbsp;·&nbsp;</span>
                <a href="${SITE_URL}/blog" style="color:${BRAND.subtle};text-decoration:none;">Field notes</a>
                <span style="color:${BRAND.border};">&nbsp;·&nbsp;</span>
                <a href="${SITE_URL}/pricing" style="color:${BRAND.subtle};text-decoration:none;">Pricing</a>
                <span style="color:${BRAND.border};">&nbsp;·&nbsp;</span>
                <a href="${SITE_URL}/contact" style="color:${BRAND.subtle};text-decoration:none;">Contact</a>
                <span style="color:${BRAND.border};">&nbsp;·&nbsp;</span>
                <a href="${SITE_URL}/status" style="color:${BRAND.subtle};text-decoration:none;">Status</a>
              </p>
              <p style="margin:0;font-family:${FONT};font-size:11.5px;line-height:1.6;color:${BRAND.faint};">
                © ${new Date().getFullYear()} The SEO SaaS. You received this because someone entered this address at TheSEOSaaS. If it wasn't you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

/**
 * The shell every email uses.
 *
 * Nested tables, fixed 560px, inline styles — the boring, portable shape. The
 * outer table paints the page background because Outlook ignores `background`
 * on `<body>`.
 */
export function layout(options: {
  heading: string;
  body: string;
  /** Inbox preview line. Distinct from the subject, and worth writing. */
  preheader: string;
}): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${escapeHtml(options.heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.background};font-family:${FONT};-webkit-font-smoothing:antialiased;">
    <!-- Preheader: shown in the inbox list, hidden in the message. The trailing
         entities stop clients pulling body copy in after it. -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
      ${escapeHtml(options.preheader)}
      &#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.background};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"
                 style="width:100%;max-width:560px;background:${BRAND.white};border:1px solid ${BRAND.border};border-radius:14px;">
            ${header()}
            <tr>
              <td style="padding:24px 32px 8px;">
                <h1 style="margin:0 0 14px;font-family:${FONT};font-size:23px;line-height:1.28;font-weight:600;color:${BRAND.text};letter-spacing:-0.025em;">${escapeHtml(options.heading)}</h1>
                ${options.body}
              </td>
            </tr>
            ${footer()}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Primary action.
 *
 * Ink fill, matching the product's own primary button. The VML block is what
 * makes it render as a filled rectangle in Outlook 2016 and Windows Mail, which
 * otherwise drop the padding and show a bare link.
 */
export function button(url: string, label: string): string {
  return `
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                 href="${url}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="23%" stroke="f" fillcolor="${BRAND.ink}">
      <w:anchorlock/>
      <center style="color:#FFFFFF;font-family:${FONT};font-size:15px;font-weight:600;">${escapeHtml(label)}</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-- -->
    <a href="${url}" style="display:inline-block;background:${BRAND.ink};color:#FFFFFF;text-decoration:none;font-family:${FONT};font-size:15px;font-weight:600;padding:13px 26px;border-radius:10px;letter-spacing:-0.01em;">${escapeHtml(label)}</a>
    <!--<![endif]-->`;
}

/** Body paragraph, at the one size and colour every template should use. */
export function paragraph(html: string, margin = "0 0 20px"): string {
  return `<p style="margin:${margin};font-family:${FONT};font-size:15px;line-height:1.65;color:${BRAND.muted};">${html}</p>`;
}
