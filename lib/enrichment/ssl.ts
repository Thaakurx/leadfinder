import tls from "node:tls";

export interface SslInfo {
  valid: boolean;
  issuer: string | null;
  expiresAt: Date | null;
}

/** Free, no-external-service SSL check via a raw TLS handshake. */
export function checkSsl(hostname: string, timeoutMs: number): Promise<SslInfo | null> {
  return new Promise((resolve) => {
    let settled = false;
    const socket = tls.connect(
      { host: hostname, port: 443, servername: hostname, timeout: timeoutMs, rejectUnauthorized: false },
      () => {
        if (settled) return;
        settled = true;
        const cert = socket.getPeerCertificate();
        const validTo = cert?.valid_to ? new Date(cert.valid_to) : null;
        const issuerRaw = cert?.issuer?.O ?? cert?.issuer?.CN ?? null;
        const issuer = Array.isArray(issuerRaw) ? issuerRaw[0] ?? null : issuerRaw;
        const valid = socket.authorized && (validTo ? validTo.getTime() > Date.now() : false);
        socket.end();
        resolve({ valid, issuer, expiresAt: validTo });
      }
    );
    socket.on("error", () => {
      if (settled) return;
      settled = true;
      resolve(null);
    });
    socket.on("timeout", () => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(null);
    });
  });
}
