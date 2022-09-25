import { isNumeric } from "../utils/string";

describe("isNumeric", () => {
  test("passes all positive cases", () => {
    // Given a set of inputs that resemble numbers
    const numbers: any[] = [
      0,
      1,
      1234567890,
      "1234567890",
      "0",
      "1",
      "1.1",
      "-1",
      "-1.2354",
      "-1234567890",
      -1,
      -32.1,
      "0x1",
    ];

    // When passed to isNumeric
    // Then they should all return true
    for (const num of numbers) {
      expect(isNumeric(num)).toBe(true);
    }
  });

  test("passes all negative cases", () => {
    // Given a set of inputs that don't resemble numbers
    const numbers: any[] = [
      true,
      false,
      "1..1",
      "1,1",
      "-32.1.12",
      "",
      "   ",
      null,
      undefined,
      [],
      NaN,
    ];

    // When passed to isNumeric
    // Then they should all return false
    for (const num of numbers) {
      expect(isNumeric(num)).toBe(false);
    }
  });
});
