import { round } from "../utils/number";

describe("round", () => {
  it.each([
    [3.141592, 0, 3],
    [3.141592, 1, 3.1],
    [3.141592, 2, 3.14],
    [3.141592, 3, 3.142],
    [3.141592, 4, 3.1416],
  ])("rounds %d to %d decimal place(s)", (num, places, roundedNum) => {
    expect(round(num, places)).toBe(roundedNum);
  });

  it.each([
    [623305.1, 0, 623305],
    [623305.1, -1, 623310],
    [623305.1, -2, 623300],
    [623305.1, -3, 623000],
    [623305.1, -4, 620000],
  ])("rounds %d to %d decimal place(s)", (num, places, roundedNum) => {
    expect(round(num, places)).toBe(roundedNum);
  });
});
