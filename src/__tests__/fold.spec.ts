import { describe, it, expect } from "@jest/globals";
import "../filter.js";
import "../fold.js";
import "../map.js";
import { intoIter } from "../into-iter-factory.js";

describe("IntoIter fold", () => {
  it("returns the initial value for an empty sequence and does not call fn", () => {
    const calls: number[] = [];

    expect(
      intoIter<number>([]).fold(10, (acc, n) => {
        calls.push(n);
        return acc + n;
      }),
    ).toBe(10);
    expect(calls).toEqual([]);
  });

  it("calls fn for every element, including the first", () => {
    const calls: [number, number][] = [];

    const total = intoIter([1, 2, 3]).fold(10, (acc, n) => {
      calls.push([acc, n]);
      return acc + n;
    });

    expect(calls).toEqual([
      [10, 1],
      [11, 2],
      [13, 3],
    ]);
    expect(total).toBe(16);
    expect(intoIter([1n, 2n, 3n]).fold(10n, (acc, n) => acc + n)).toBe(16n);
  });

  it("builds a value of a different type", () => {
    expect(intoIter([1, 2, 3]).fold("", (acc, n) => acc + n)).toBe("123");
    expect(intoIter([1, 2, 3]).fold(0, (acc, n) => acc * 10 + n)).toBe(123);
  });

  it("folds a reversed chain from the back", () => {
    expect(intoIter([1, 2, 3]).reversed.fold("", (acc, n) => acc + n)).toBe("321");
    expect(intoIter([1, 2, 3]).reversed.fold(0, (acc, n) => acc * 10 + n)).toBe(321);
  });

  it("folds the values kept by filter", () => {
    expect(
      intoIter([1, 2, 3, 4])
        .filter((n) => n % 2 === 0)
        .fold(0, (acc, n) => acc + n),
    ).toBe(6);
  });

  it("does not read the source until fold runs", () => {
    const calls: number[] = [];
    const values = intoIter([1, 2, 3]).map((n) => {
      calls.push(n);
      return n * 10;
    });

    expect(calls).toEqual([]);
    expect(values.fold(0, (acc, n) => acc + n)).toBe(60);
    expect(calls).toEqual([1, 2, 3]);
  });

  it("leaves the source readable", () => {
    const source = intoIter([1, 2, 3]);

    expect(source.fold(0, (acc, n) => acc + n)).toBe(6);
    expect(source.fold("", (acc, n) => acc + n)).toBe("123");
    expect([...source]).toEqual([1, 2, 3]);
  });

  describe("foldRight", () => {
    it("returns the initial value for an empty sequence and does not call fn", () => {
      const calls: number[] = [];

      expect(
        intoIter<number>([]).foldRight(10, (acc, n) => {
          calls.push(n);
          return acc + n;
        }),
      ).toBe(10);
      expect(calls).toEqual([]);
    });

    it("calls fn from the back, including the last element first", () => {
      const calls: [number, number][] = [];

      const total = intoIter([1, 2, 3]).foldRight(10, (acc, n) => {
        calls.push([acc, n]);
        return acc + n;
      });

      expect(calls).toEqual([
        [10, 3],
        [13, 2],
        [15, 1],
      ]);
      expect(total).toBe(16);
      expect(intoIter([1n, 2n, 3n]).foldRight(10n, (acc, n) => acc + n)).toBe(16n);
    });

    it("builds a value from the back", () => {
      expect(intoIter([1, 2, 3]).foldRight("", (acc, n) => acc + n)).toBe("321");
      expect(intoIter([1, 2, 3]).foldRight(0, (acc, n) => acc * 10 + n)).toBe(321);
      expect(intoIter("ab").foldRight("", (acc, char) => acc + char)).toBe("ba");
    });

    it("walks a reversed chain forward", () => {
      expect(intoIter([1, 2, 3]).reversed.foldRight("", (acc, n) => acc + n)).toBe("123");
      expect(intoIter([1, 2, 3]).reversed.foldRight(0, (acc, n) => acc * 10 + n)).toBe(123);
    });

    it("folds filtered values from the back", () => {
      expect(
        intoIter([1, 2, 3, 4])
          .filter((n) => n % 2 === 0)
          .foldRight(0, (acc, n) => acc * 10 + n),
      ).toBe(42);
    });

    it("does not read the source until foldRight runs", () => {
      const calls: number[] = [];
      const values = intoIter([1, 2, 3]).map((n) => {
        calls.push(n);
        return n * 10;
      });

      expect(calls).toEqual([]);
      expect(values.foldRight(0, (acc, n) => acc + n)).toBe(60);
      expect(calls).toEqual([3, 2, 1]);
    });

    it("leaves the source readable", () => {
      const source = intoIter([1, 2, 3]);

      expect(source.foldRight("", (acc, n) => acc + n)).toBe("321");
      expect(source.foldRight("", (acc, n) => acc + n)).toBe("321");
      expect([...source]).toEqual([1, 2, 3]);
    });

    it("throws when the source cannot walk backwards", () => {
      let calls = 0;

      expect(() =>
        intoIter(new Set([1, 2, 3])).foldRight(0, (acc, n) => {
          calls += 1;
          return acc + n;
        }),
      ).toThrow("Cannot walk backwards");
      expect(calls).toBe(0);
    });
  });
});
