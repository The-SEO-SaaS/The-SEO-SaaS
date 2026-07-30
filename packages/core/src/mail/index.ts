import { sendMail, verifyMailConnection } from "./mailer.ts";
import {
  auditReadyTemplate,
  magicLinkTemplate,
  type AuditReadyTemplateInput,
  type MagicLinkTemplateInput,
} from "./templates.ts";

export { sendMail, verifyMailConnection, getTransporter } from "./mailer.ts";
export { escapeHtml, magicLinkTemplate, auditReadyTemplate } from "./templates.ts";

export async function sendMagicLinkEmail(
  input: MagicLinkTemplateInput & { to: string },
): Promise<void> {
  const { subject, html, text } = magicLinkTemplate(input);
  await sendMail({ to: input.to, subject, html, text });
}

export async function sendAuditReadyEmail(
  input: AuditReadyTemplateInput & { to: string },
): Promise<void> {
  const { subject, html, text } = auditReadyTemplate(input);
  await sendMail({ to: input.to, subject, html, text });
}
