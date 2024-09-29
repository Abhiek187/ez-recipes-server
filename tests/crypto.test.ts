import Encryptor from "../utils/crypto";

describe("crypto", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, SECRET_KEY: "test" };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = OLD_ENV;
  });

  it.each(["", "test", "The quick brown fox jumps over the lazy dog."])(
    "should encrypt and decrypt: %s",
    (originalStr: string) => {
      const encryptor = new Encryptor();
      const encryptedStr = encryptor.encrypt(originalStr);
      const decryptedStr = encryptor.decrypt(encryptedStr);

      expect(encryptedStr).not.toBe(originalStr);
      expect(decryptedStr).toBe(originalStr);
    }
  );
});
