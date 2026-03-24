import { describe, it, expect, beforeAll } from "vitest";
import { generateKeyPairSync, createPublicKey, verify } from "node:crypto";
import { TokenManager } from "../../src/auth/jwt.js";
import { normalizePrivateKey } from "../../src/util/config.js";

let privateKeyPem: string;
let publicKeyPem: string;

beforeAll(() => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
  publicKeyPem = publicKey.export({ type: "spki", format: "pem" }) as string;
});

function decodeJwtPart(part: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(part, "base64url").toString());
}

describe("TokenManager", () => {
  it("generates a valid JWT with correct header", () => {
    const tm = new TokenManager({
      issuerId: "test-issuer",
      keyId: "TEST_KEY",
      privateKey: privateKeyPem,
    });

    const token = tm.getToken();
    const [headerB64] = token.split(".");
    const header = decodeJwtPart(headerB64);

    expect(header.alg).toBe("ES256");
    expect(header.kid).toBe("TEST_KEY");
    expect(header.typ).toBe("JWT");
  });

  it("generates a valid JWT with correct payload", () => {
    const tm = new TokenManager({
      issuerId: "test-issuer",
      keyId: "TEST_KEY",
      privateKey: privateKeyPem,
    });

    const before = Math.floor(Date.now() / 1000);
    const token = tm.getToken();
    const after = Math.floor(Date.now() / 1000);

    const [, payloadB64] = token.split(".");
    const payload = decodeJwtPart(payloadB64);

    expect(payload.iss).toBe("test-issuer");
    expect(payload.aud).toBe("appstoreconnect-v1");
    expect(payload.iat).toBeGreaterThanOrEqual(before);
    expect(payload.iat).toBeLessThanOrEqual(after);
    expect(payload.exp).toBe((payload.iat as number) + 1200);
  });

  it("produces a valid ES256 signature", () => {
    const tm = new TokenManager({
      issuerId: "test-issuer",
      keyId: "TEST_KEY",
      privateKey: privateKeyPem,
    });

    const token = tm.getToken();
    const [headerB64, payloadB64, signatureB64] = token.split(".");
    const signingInput = `${headerB64}.${payloadB64}`;
    const signature = Buffer.from(signatureB64, "base64url");

    const isValid = verify(
      "SHA256",
      Buffer.from(signingInput),
      { key: createPublicKey(publicKeyPem), dsaEncoding: "ieee-p1363" },
      signature,
    );

    expect(isValid).toBe(true);
  });

  it("caches tokens within expiry window", () => {
    const tm = new TokenManager({
      issuerId: "test-issuer",
      keyId: "TEST_KEY",
      privateKey: privateKeyPem,
    });

    const token1 = tm.getToken();
    const token2 = tm.getToken();

    expect(token1).toBe(token2);
  });

  it("throws a clear error for an invalid private key", () => {
    const tm = new TokenManager({
      issuerId: "test-issuer",
      keyId: "TEST_KEY",
      privateKey: "not-a-valid-key",
    });

    expect(() => tm.getToken()).toThrow(
      "Failed to parse private key",
    );
  });
});

describe("normalizePrivateKey", () => {
  it("replaces literal \\n with real newlines", () => {
    const escaped = privateKeyPem.replace(/\n/g, "\\n");
    const normalized = normalizePrivateKey(escaped);
    expect(normalized.trim()).toBe(privateKeyPem.trim());
  });

  it("works with keys that have literal \\n for JWT signing", () => {
    const escaped = privateKeyPem.replace(/\n/g, "\\n");
    const normalized = normalizePrivateKey(escaped);

    const tm = new TokenManager({
      issuerId: "test-issuer",
      keyId: "TEST_KEY",
      privateKey: normalized,
    });

    const token = tm.getToken();
    const [headerB64, payloadB64, signatureB64] = token.split(".");
    const signingInput = `${headerB64}.${payloadB64}`;
    const signature = Buffer.from(signatureB64, "base64url");

    const isValid = verify(
      "SHA256",
      Buffer.from(signingInput),
      { key: createPublicKey(publicKeyPem), dsaEncoding: "ieee-p1363" },
      signature,
    );

    expect(isValid).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    const padded = `  \n${privateKeyPem}\n  `;
    const normalized = normalizePrivateKey(padded);
    expect(normalized).toBe(privateKeyPem.trim() + "\n");
  });
});
