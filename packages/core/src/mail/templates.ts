import { toParagraphs } from "../util/prose.ts";
import { BRAND, FONT, button, escapeHtml, layout, paragraph } from "./brand.ts";

/**
 * Email templates.
 *
 * Plain functions returning HTML strings — no template engine, no React Email.
 * Chrome (masthead, footer, button, palette) lives in ./brand.ts so every
 * message is recognisably the same product; this file only decides what each
 * one says.
 *
 * Every template returns `text` as well as `html`, and the text version is
 * written rather than stripped. A missing plain-text part measurably hurts
 * deliverability, and for a sender with no domain reputation yet that matters
 * more than it would for an established one.
 */

export { escapeHtml };

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
  const heading = input.isNewUser ? "Let's get your SEO moving" : "Sign in to TheSEOSaaS";
  const label = input.isNewUser ? "Create my account" : "Sign in";

  const html = layout({
    heading,
    // The expiry, not the greeting. Someone scanning an inbox for a sign-in
    // link needs to know whether this one is still good.
    preheader: `Your sign-in link expires in ${input.expiresInMinutes} minutes.`,
    body: `
      ${paragraph(
        `Click below to ${
          input.isNewUser ? "finish setting up your account" : "sign in"
        }. This link works once and expires in ${input.expiresInMinutes} minutes.`,
      )}
      <p style="margin:0 0 24px;">${button(input.url, label)}</p>
      ${paragraph("Or paste this into your browser:", "0 0 6px")}
      <p style="margin:0 0 4px;font-family:${FONT};font-size:13px;line-height:1.6;word-break:break-all;color:${BRAND.ink};">${input.url}</p>
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

/** Matches the report's own bands, so the email and the page can't disagree. */
function scoreTone(score: number): { fill: string; text: string; label: string } {
  if (score >= 75) return { fill: BRAND.goodSoft, text: BRAND.good, label: "Good" };
  if (score >= 50) return { fill: BRAND.warnSoft, text: BRAND.warn, label: "Fair" };
  return { fill: BRAND.badSoft, text: BRAND.bad, label: "Needs work" };
}

export function auditReadyTemplate(input: AuditReadyTemplateInput): {
  subject: string;
  html: string;
  text: string;
} {
  const heading = `Your SEO audit for ${input.domain} is ready`;
  const tone = scoreTone(input.score);

  // Broken up the same way the report page breaks it, so someone who reads the
  // email and then opens the link sees the same document rather than two
  // differently-shaped versions of one verdict.
  const verdict = toParagraphs(input.headline);

  const html = layout({
    heading,
    // The preheader gets the whole thing on one line — inbox previews collapse
    // whitespace anyway, and truncating at the first paragraph would cut the
    // sentence that makes someone open it.
    preheader: input.headline.replace(/\s+/g, " "),
    body: `
      ${verdict.map((part) => paragraph(escapeHtml(part))).join("\n")}

      <!-- Score panel. The number is the reason to open the link, so it's
           shown here rather than making someone click to find out. -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"
             style="margin:0 0 24px;width:100%;background:${tone.fill};border-radius:12px;">
        <tr>
          <td style="padding:18px 22px;">
            <p style="margin:0 0 2px;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:0.08em;color:${tone.text};">SEO SCORE</p>
            <p style="margin:0;font-family:${FONT};font-size:34px;font-weight:600;line-height:1.1;letter-spacing:-0.03em;color:${tone.text};">
              ${input.score}<span style="font-size:17px;font-weight:500;opacity:0.6;">/100</span>
              <span style="font-size:14px;font-weight:600;padding-left:8px;">${tone.label}</span>
            </p>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 20px;">${button(input.url, "Read the full report")}</p>
      ${paragraph(
        "The report stays available at that link — it's shareable, so you can send it to whoever owns the site.",
        "0",
      )}
    `,
  });

  const text = [
    heading,
    "",
    // Blank line between paragraphs in the plain-text part too. A wall of text
    // is worse there than in HTML, since there's no typography to carry it.
    verdict.join("\n\n"),
    "",
    `SEO score: ${input.score}/100 (${tone.label})`,
    "",
    `Read the full report: ${input.url}`,
    "",
    "That link is shareable and stays available.",
  ].join("\n");

  return { subject: heading, html, text };
}
