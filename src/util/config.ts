import { readFileSync } from "node:fs";
import { createPrivateKey } from "node:crypto";

export interface AppStoreConnectConfig {
  issuerId: string;
  keyId: string;
  privateKey: string;
}

export function normalizePrivateKey(raw: string): string {
  // Replace literal \n sequences with real newlines (common in env vars)
  let key = raw.replace(/\\n/g, "\n").trim();

  // Ensure the key ends with a trailing newline (required by some PEM parsers)
  if (!key.endsWith("\n")) {
    key += "\n";
  }

  return key;
}

export function loadConfig(): AppStoreConnectConfig {
  const issuerId = process.env.APPLE_ISSUER_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKeyPath = process.env.APPLE_PRIVATE_KEY_PATH;
  const privateKeyRaw = process.env.APPLE_PRIVATE_KEY;

  if (!issuerId) {
    throw new Error("APPLE_ISSUER_ID environment variable is required");
  }
  if (!keyId) {
    throw new Error("APPLE_KEY_ID environment variable is required");
  }

  let privateKey: string;
  if (privateKeyRaw) {
    privateKey = normalizePrivateKey(privateKeyRaw);
  } else if (privateKeyPath) {
    try {
      privateKey = normalizePrivateKey(readFileSync(privateKeyPath, "utf-8"));
    } catch (error) {
      throw new Error(
        `Cannot read private key at "${privateKeyPath}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } else {
    throw new Error(
      "Either APPLE_PRIVATE_KEY or APPLE_PRIVATE_KEY_PATH environment variable is required",
    );
  }

  // Validate the key is parseable at startup
  try {
    createPrivateKey(privateKey);
  } catch {
    throw new Error(
      'Invalid private key format. Ensure your .p8 file is a valid PKCS#8 PEM key starting with "-----BEGIN PRIVATE KEY-----". ' +
        "If using APPLE_PRIVATE_KEY env var, check that newlines are correctly escaped as \\n.",
    );
  }

  return { issuerId: issuerId!, keyId: keyId!, privateKey };
}

/** Non-throwing variant: returns config or null if credentials are missing. */
export function tryLoadConfig(): {
  config: AppStoreConnectConfig | null;
  error: string | null;
} {
  try {
    return { config: loadConfig(), error: null };
  } catch (e) {
    return { config: null, error: e instanceof Error ? e.message : String(e) };
  }
}
