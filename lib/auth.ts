// Web Crypto API only (no Node `Buffer`/`crypto` module) so this works in
// both the Edge and Node.js middleware runtimes without extra config.
export const AUTH_COOKIE = "leadfinder_auth";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Derives a session token from the configured password instead of storing
// the password itself in the cookie. Anyone who knows APP_PASSWORD can
// compute the same token, which is fine — that's the same thing as knowing
// the password — but it means a leaked cookie alone doesn't reveal the
// plaintext password.
export async function computeAuthToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode("leadfinder-session"));
  return toHex(signature);
}
