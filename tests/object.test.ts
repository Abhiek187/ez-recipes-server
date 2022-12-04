import { isObject } from "../utils/object";
import { expectedRecipe, mockSearchResponse } from "./recipeUtils.test";

describe("isObject", () => {
  it("passes all positive cases", () => {
    // Given a set of inputs that resemble objects
    const goodObjects: any[] = [
      {},
      { a: 1, b: 2 },
      mockSearchResponse,
      expectedRecipe,
      Math,
      JSON,
      Object.create(null),
      new Number(3),
      new Date(),
    ];

    // When passed to isObject
    // Then they should all return true
    for (const obj of goodObjects) {
      expect(isObject(obj)).toBe(true);
    }
  });

  it("passes all negative cases", () => {
    // Given a set of inputs that don't resemble objects
    const badObjects: any[] = [
      undefined,
      null,
      true,
      false,
      0,
      -1.23e-5,
      NaN,
      "",
      "bad",
      NaN,
      [],
      [1, "is", true],
      Array.prototype,
    ];

    // When passed to isObject
    // Then they should all return false
    for (const obj of badObjects) {
      expect(isObject(obj)).toBe(false);
    }
  });
});
