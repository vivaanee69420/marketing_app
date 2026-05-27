import crypto from "node:crypto";

// AES-256-GCM encryption for OAuth/API tokens at rest. Envelope format:
//   base64(iv):base64(authTag):base64(ciphertext)
// ENCRYPTION_KEY must be 32 bytes, supplied as 64-char hex or base64.

const ALGO = "aes-256-gcm";
const IV_LEN = 12; // GCM standard nonce

function loadKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY is not set");
  let key;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    key = Buffer.from(raw, "base64");
  }
  if (key.length !== 32) {
    throw new Error(`ENCRYPTION_KEY must decode to 32 bytes (got ${key.length})`);
  }
  return key;
}

/** Encrypt a string → "iv:authTag:ciphertext" (all base64). Returns null for null/empty. */
export function encrypt(plaintext) {
  if (plaintext == null || plaintext === "") return null;
  const key = loadKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

/** Decrypt an "iv:authTag:ciphertext" envelope → plaintext. Returns null for null. */
export function decrypt(envelope) {
  if (!envelope) return null;
  const parts = String(envelope).split(":");
  if (parts.length !== 3) throw new Error("malformed ciphertext envelope");
  const [ivB64, tagB64, ctB64] = parts;
  const key = loadKey();
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]);
  return pt.toString("utf8");
}
