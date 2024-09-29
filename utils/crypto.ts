import crypto from "crypto";

/**
 * Helper class to encrypt and decrypt strings: https://stackoverflow.com/a/66476430
 */
export default class Encryptor {
  private readonly ALGORITHM: crypto.CipherGCMTypes = "aes-256-gcm";
  private readonly SALT = "p0BhlFZnUP4aGMHFVsTJuw=="; // at least 16 bytes & random
  private readonly PLAINTEXT_ENCODING: crypto.Encoding = "utf8";
  private readonly ENCRYPTED_ENCODING: crypto.Encoding = "base64";

  private readonly KEY_LENGTH = 32; // 256 bits = 32 bytes
  private readonly IV_LENGTH = 12; // 96 bits recommended
  private readonly AUTH_TAG_LENGTH = 16; // 128 bits recommended

  private key: crypto.CipherKey;

  constructor() {
    if (!process.env.SECRET_KEY) throw new Error("Password not found");

    this.key = crypto.scryptSync(
      process.env.SECRET_KEY,
      this.SALT,
      this.KEY_LENGTH
    );
  }

  encrypt(clearText: string) {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.key, iv, {
      authTagLength: this.AUTH_TAG_LENGTH,
    });
    const encrypted = cipher.update(
      clearText,
      this.PLAINTEXT_ENCODING,
      this.ENCRYPTED_ENCODING
    );

    // Combine the IV & auth tag to the encrypted string so they can be used for decryption
    return [
      encrypted + cipher.final(this.ENCRYPTED_ENCODING),
      Buffer.from(iv).toString(this.ENCRYPTED_ENCODING),
      cipher.getAuthTag().toString(this.ENCRYPTED_ENCODING),
    ].join("|");
  }

  decrypt(encryptedText: string) {
    const [encrypted, iv, authTag] = encryptedText.split("|");
    if (!iv) throw new Error("IV not found");
    if (!authTag) throw new Error("Auth tag not found");

    const decipher = crypto.createDecipheriv(
      this.ALGORITHM,
      this.key,
      Buffer.from(iv, this.ENCRYPTED_ENCODING),
      {
        authTagLength: this.AUTH_TAG_LENGTH,
      }
    );
    decipher.setAuthTag(Buffer.from(authTag, this.ENCRYPTED_ENCODING));
    return (
      decipher.update(
        encrypted,
        this.ENCRYPTED_ENCODING,
        this.PLAINTEXT_ENCODING
      ) + decipher.final(this.PLAINTEXT_ENCODING)
    );
  }
}
