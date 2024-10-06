import { filterObject, isEmptyObject, isObject } from "../utils/object";
import { expectedRecipe, mockSearchResponse } from "./recipeUtils.test";

describe("isObject", () => {
  it.each([
    {},
    { a: 1, b: 2 },
    mockSearchResponse,
    expectedRecipe,
    Math,
    JSON,
    Object.create(null),
    new Number(3),
    new Date(),
  ])("passes all positive cases", (obj: unknown) => {
    // Given a set of inputs that resemble objects
    // When passed to isObject
    // Then they should all return true
    expect(isObject(obj)).toBe(true);
  });

  it.each([
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
  ])("passes all negative cases", (obj: unknown) => {
    // Given a set of inputs that don't resemble objects
    // When passed to isObject
    // Then they should all return false
    expect(isObject(obj)).toBe(false);
  });
});

describe("isEmptyObject", () => {
  it.each([
    {},
    Number(),
    Error(),
    Object(),
    Object.create(null),
    Object.create({}),
    Math,
    JSON,
  ])("passes all positive cases", (obj) => {
    // Given a set of objects that are empty
    // When passed to isEmptyObject
    // They they should all return true
    expect(isEmptyObject(obj)).toBe(true);
  });

  it.each([{ not: "empty" }, { "": {} }, mockSearchResponse, expectedRecipe])(
    "passes all negative cases",
    (obj) => {
      // Given a set of objects that aren't empty
      // When passed to isEmptyObject
      // They they should all return false
      expect(isEmptyObject(obj)).toBe(false);
    }
  );
});

describe("filterObject", () => {
  const object = { a: 1, b: "is", c: true };

  it("creates an identical object if all keys are passed", () => {
    const keys = ["a", "b", "c"];
    const filteredObject = filterObject(object, keys);

    expect(Object.is(object, filteredObject)).toBe(false);
    expect(object).toMatchObject(filteredObject);
  });

  it("filters some keys in the object", () => {
    const keys = ["a", "c"];
    const filteredObject = filterObject(object, keys);

    expect(Object.keys(filteredObject).sort()).toEqual(keys.sort());
  });

  it("returns an empty object if no keys are passed", () => {
    const keys: string[] = [];
    const filteredObject = filterObject(object, keys);

    expect(isEmptyObject(filteredObject)).toBe(true);
  });

  it("ignores keys not present in the object", () => {
    const keys = ["b", "d"];
    const filteredObject = filterObject(object, keys);

    expect(Object.keys(filteredObject).sort()).toEqual(["b"]);
  });
});
