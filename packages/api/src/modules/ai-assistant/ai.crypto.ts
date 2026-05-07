import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../../config/env";
import { BadRequestError } from "../../shared/errors";

const SECRET_VERSION = "v1";

function getEncryptionKey() {
  if (!env.AI_SECRET_ENCRYPTION_KEY?.trim()) {
    throw new BadRequestError("Thiếu AI_SECRET_ENCRYPTION_KEY nên không thể lưu API key AI");
  }

  return createHash("sha256").update(env.AI_SECRET_ENCRYPTION_KEY).digest();
}

export function encryptSecret(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    SECRET_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptSecret(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const [version, ivRaw, tagRaw, encryptedRaw] = value.split(":");
  if (version !== SECRET_VERSION || !ivRaw || !tagRaw || !encryptedRaw) {
    throw new BadRequestError("API key AI đã lưu không đúng định dạng mã hóa");
  }

  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
