import nodemailer, { type Transporter } from "nodemailer";

import { env } from "@theseosaas/env/server";

import { AppError } from "../errors.ts";

/**
 * Email transport — nodemailer over plain SMTP. No Resend/Postmark/SendGrid
 * SDK, so the provider is a config change rather than a code change.
 *
 * The transporter is created lazily and reused: nodemailer pools connections,
 * and rebuilding it per send would open a new SMTP handshake every time.
 */

let transporter: Transporter | null = null;

export function getTransporter(): Transporter {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    // Port 465 is implicit TLS; 587 upgrades via STARTTLS.
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
  });

  return transporter;
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  /** Plain-text fallback. Always send one — it materially helps deliverability. */
  text: string;
  replyTo?: string;
}

export async function sendMail(input: SendMailInput): Promise<{ messageId: string }> {
  try {
    const info = await getTransporter().sendMail({
      from: env.MAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });

    return { messageId: info.messageId };
  } catch (cause) {
    // Surfaced as UPSTREAM so a broken SMTP host reads as a provider outage in
    // logs rather than an application bug.
    throw AppError.upstream("We couldn't send that email. Please try again.", {
      cause,
      details: { provider: "smtp" },
    });
  }
}

/** Verifies SMTP credentials. Useful as a startup or health check. */
export async function verifyMailConnection(): Promise<boolean> {
  try {
    await getTransporter().verify();
    return true;
  } catch {
    return false;
  }
}
