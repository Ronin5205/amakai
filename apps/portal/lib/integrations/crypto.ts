import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const raw =
    process.env.SECRETS_ENCRYPTION_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    ""

  if (!raw) {
    throw new Error(
      "Missing SECRETS_ENCRYPTION_KEY (or SUPABASE_SECRET_KEY fallback). Add it to apps/portal/.env.local"
    )
  }

  // Derive a stable 32-byte key from whatever secret string is configured.
  return createHash("sha256").update(raw).digest()
}

/** Encrypts JSON-serializable payload to a base64url string (iv.tag.ciphertext). */
export function encryptSecretPayload(payload: unknown): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const plaintext = Buffer.from(JSON.stringify(payload), "utf8")
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()

  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".")
}

/** Decrypts a payload produced by encryptSecretPayload. */
export function decryptSecretPayload<T = unknown>(encrypted: string): T {
  const key = getEncryptionKey()
  const parts = encrypted.split(".")
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted secret format.")
  }

  const [ivB64, tagB64, dataB64] = parts
  const iv = Buffer.from(ivB64, "base64url")
  const tag = Buffer.from(tagB64, "base64url")
  const data = Buffer.from(dataB64, "base64url")

  if (iv.length !== IV_LENGTH || tag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Invalid encrypted secret parameters.")
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  return JSON.parse(decrypted.toString("utf8")) as T
}
