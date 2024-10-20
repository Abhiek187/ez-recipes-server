import { isAtLeastDaysOld, isInteger, isNumeric } from "../utils/string";

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
  ])("passes positive case: %s", (num: number | string) => {
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
  ])("passes negative case: %s", (num: unknown) => {
    // Given a set of inputs that don't resemble numbers
    // When passed to isNumeric
    // Then they should all return false
    expect(isNumeric(num as number | string)).toBe(false);
  });
});

describe("isInteger", () => {
  it.each([0, 1, 1234567890, "1234567890", "0", "1", "-1", -1, "0x1"])(
    "passes positive case: %s",
    (num: number | string) => {
      // Given a set of inputs that resemble integers
      // When passed to isInteger
      // Then they should all return true
      expect(isInteger(num)).toBe(true);
    }
  );

  it.each([
    "1.1",
    "-1.2354",
    -32.1,
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
  ])("passes negative case: %s", (num: unknown) => {
    // Given a set of inputs that don't resemble integers
    // When passed to isInteger
    // Then they should all return false
    expect(isInteger(num as number | string)).toBe(false);
  });
});

describe("isAtLeastDaysOld", () => {
  const mockDate = new Date(2024, 9, 19, 15, 48, 50);

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(mockDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    [new Date(2024, 9, 12).toUTCString(), 7],
    [new Date(2024, 8, 19, 15, 48, 50).toUTCString(), 7],
    [new Date(2024, 9, 18, 15, 48, 50).toUTCString(), 1],
    [mockDate.toUTCString(), 0],
  ])(
    `passes positive case: ${mockDate.toUTCString()} - %s >= %d day(s)`,
    (date, days) => {
      expect(isAtLeastDaysOld(date, days)).toBe(true);
    }
  );

  it.each([
    [new Date(2024, 9, 15, 21, 56, 55).toUTCString(), 7],
    [new Date(2024, 9, 12, 16, 48, 50).toUTCString(), 7],
    [mockDate.toUTCString(), 1],
  ])(
    `passes negative case: ${mockDate.toUTCString()} - %s < %d day(s)`,
    (date, days) => {
      expect(isAtLeastDaysOld(date, days)).toBe(false);
    }
  );

  it.each(["", "cheese", "Wed, 32 Feb 2024", new Date("bacon").toUTCString()])(
    "returns false for invalid date: %s",
    (date) => {
      expect(isAtLeastDaysOld(date, 0)).toBe(false);
    }
  );
});
