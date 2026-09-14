import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const PREFIX = "enc:v1:";

function deriveKey(): Buffer {
  const raw = process.env.PLATFORM_SECRETS_KEY || process.env.BETTER_AUTH_SECRET || "dev-platform-secrets-key";
  return createHash("sha256").update(raw).digest();
}

/** Encrypt a secret string for storage in platform_settings. */
export function encryptSecret(plain: string): string {
  if (!plain) return "";
  if (plain.startsWith(PREFIX)) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

export function decryptSecret(stored: string): string {
  if (!stored) return "";
  if (!stored.startsWith(PREFIX)) return stored;
  const body = stored.slice(PREFIX.length);
  const [ivB64, tagB64, dataB64] = body.split(".");
  if (!ivB64 || !tagB64 || !dataB64) return "";
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(), Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function maskSecret(value: string): string {
  if (!value) return "";
  const plain = value.startsWith(PREFIX) ? "••••••••" : value;
  if (plain.length <= 4) return "••••";
  return `••••${plain.slice(-4)}`;
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}
