import { AppError } from "../errors.js";

/**
 * The free audit takes whatever a founder pastes into the hero input. That
 * means "acme.com", "https://acme.com/", "www.acme.com/pricing?ref=x" all have
 * to collapse to one canonical key, or we cache-miss and re-bill ourselves for
 * the same site.
 */

const IP_LIKE = /^\d{1,3}(\.\d{1,3}){3}$/;

export function normalizeDomain(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) throw AppError.badRequest("Enter your website URL.");

  const withScheme = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;

  let host: string;
  try {
    host = new URL(withScheme).hostname;
  } catch {
    throw AppError.badRequest("That doesn't look like a valid website URL.");
  }

  host = host.replace(/^www\./, "").replace(/\.$/, "");

  // Reject localhost, bare IPs, and anything without a dot — these are almost
  // always typos, and running an audit on one burns real provider credits.
  if (!host.includes(".") || IP_LIKE.test(host) || host === "localhost") {
    throw AppError.badRequest("Enter a public website domain, e.g. acme.com");
  }

  return host;
}

export function toUrl(domain: string, path = "/"): string {
  return new URL(path, `https://${normalizeDomain(domain)}`).toString();
}

/** True when both URLs resolve to the same registrable host. */
export function isSameDomain(a: string, b: string): boolean {
  try {
    return normalizeDomain(a) === normalizeDomain(b);
  } catch {
    return false;
  }
}

/** Extracts the host from a result URL, tolerating junk without throwing. */
export function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}
