import { sendMail, verifyMailConnection } from "./mailer.js";
import {
  auditReadyTemplate,
  magicLinkTemplate,
  type AuditReadyTemplateInput,
  type MagicLinkTemplateInput,
} from "./templates.js";

export { sendMail, verifyMailConnection, getTransporter } from "./mailer.js";
export { escapeHtml, magicLinkTemplate, auditReadyTemplate } from "./templates.js";

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
