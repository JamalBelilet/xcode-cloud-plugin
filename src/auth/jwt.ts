import { createPrivateKey, sign } from "node:crypto";

export interface AuthConfig {
  issuerId: string;
  keyId: string;
  privateKey: string;
}

function base64url(data: Buffer | string): string {
  const buf = typeof data === "string" ? Buffer.from(data) : data;
  return buf.toString("base64url");
}

export class TokenManager {
  private config: AuthConfig;
  private cachedToken: string | null = null;
  private cachedExpiry = 0;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  getToken(): string {
    const now = Math.floor(Date.now() / 1000);

    if (this.cachedToken && now < this.cachedExpiry - 60) {
      return this.cachedToken;
    }

    const header = base64url(
      JSON.stringify({ alg: "ES256", kid: this.config.keyId, typ: "JWT" }),
    );

    const exp = now + 1200;
    const payload = base64url(
      JSON.stringify({
        iss: this.config.issuerId,
        iat: now,
        exp,
        aud: "appstoreconnect-v1",
      }),
    );

    const signingInput = `${header}.${payload}`;

    let key;
    try {
      key = createPrivateKey(this.config.privateKey);
    } catch {
      throw new Error(
        "Failed to parse private key. Run /xcode-cloud:setup to reconfigure credentials.",
      );
    }
    const signature = sign("SHA256", Buffer.from(signingInput), {
      key,
      dsaEncoding: "ieee-p1363",
    });

    const token = `${signingInput}.${base64url(signature)}`;

    this.cachedToken = token;
    this.cachedExpiry = exp;

    return token;
  }
}
