import { getRandomElement, zip } from "../utils/array";

describe("getRandomElement", () => {
  it("returns an element in the array", () => {
    // Given an array with N elements
    const array = [1, 2, 3];
    // When getRandomElement() is called
    const randomNum = getRandomElement(array);
    // Then the element returned must be in the array
    // Note: Math.random() doesn't provide a way to initalize a seed,
    // so we can't guarantee the function returns a certain element
    expect(array).toEqual(expect.arrayContaining([randomNum]));
  });

  it("returns the same element if the array's length is 1", () => {
    // Given an array with one element
    const array = ["chrysno"];
    // When getRandomElement() is called
    const randomString = getRandomElement(array);
    // Then the function should return that one element
    expect(randomString).toBe(array[0]);
  });

  it("throws an error if the array is empty", () => {
    // Given an empty array
    const emptyArray: object[] = [];
    // When getRandomElement() is called
    // Then the function should throw an error stating that the array
    // must contain at least one element
    expect(() => getRandomElement(emptyArray)).toThrow(
      "The array must contain at least one element to be randomly selected."
    );
  });
});

describe("zip", () => {
  it("combines empty arrays", () => {
    // Given 2 empty arrays
    const a: never[] = [];
    const b: never[] = [];
    // When zipped
    const zipped = zip(a, b);
    // Then it returns an empty array
    expect(zipped).toStrictEqual([]);
  });

  it("combines arrays of the same length", () => {
    // Given 2 arrays of the same length
    const a = [1, 2, 3];
    const b = ["a", "b", "c"];
    // When zipped
    const zipped = zip(a, b);
    // Then it returns even pairs
    expect(zipped).toStrictEqual([
      [1, "a"],
      [2, "b"],
      [3, "c"],
    ]);
  });

  it("combines if the first array is longer than the second", () => {
    // Given 2 arrays where a > b
    const a = [1, 2, 3];
    const b = [4, 5];
    // When zipped
    const zipped = zip(a, b);
    // Then the latter pair is padded with undefined
    expect(zipped).toStrictEqual([
      [1, 4],
      [2, 5],
      [3, undefined],
    ]);
  });

  it("combines if the first array is shorter than the second", () => {
    // Given 2 arrays where a < b
    const a = [1, 2];
    const b = [3, 4, 5];
    // When zipped
    const zipped = zip(a, b);
    // Then the former pair is padded with undefined
    expect(zipped).toStrictEqual([
      [1, 3],
      [2, 4],
      [undefined, 5],
    ]);
  });
});
