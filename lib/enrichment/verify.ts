import dns from "node:dns/promises";
import type { EmailVerificationStatus } from "@/lib/types";

const EMAIL_SYNTAX_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Free syntax + MX-record check — confirms the address is well-formed and
 * that its domain can receive mail. This does NOT confirm the specific
 * mailbox exists (that requires SMTP probing or a paid verification API,
 * which this app deliberately doesn't do).
 */
export async function verifyEmailSyntaxAndMx(
  email: string
): Promise<EmailVerificationStatus> {
  if (!EMAIL_SYNTAX_REGEX.test(email)) return "invalid";
  const domain = email.split("@")[1];
  try {
    const records = await dns.resolveMx(domain);
    return records.length > 0 ? "valid" : "invalid";
  } catch {
    // DNS lookup failed or timed out — inconclusive, not necessarily invalid.
    return "unknown";
  }
}
