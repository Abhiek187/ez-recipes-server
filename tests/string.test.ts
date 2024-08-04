import { isNumeric } from "../utils/string";

describe("isNumeric", () => {
  it.each([
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
  ])("passes all positive cases", (num: number | string) => {
    // Given a set of inputs that resemble numbers
    // When passed to isNumeric
    // Then they should all return true
    expect(isNumeric(num)).toBe(true);
  });

  it.each([
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
  ])("passes all negative cases", (num: unknown) => {
    // Given a set of inputs that don't resemble numbers
    // When passed to isNumeric
    // Then they should all return false
    expect(isNumeric(num as number | string)).toBe(false);
  });
});
