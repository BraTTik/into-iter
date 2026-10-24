import { describe, it, expect } from "@jest/globals";
import "../filter.js";
import "../map.js";
import "../limit.js";
import { intoIter } from "../into-iter-factory.js";

const collect = <T>(iter: Iterable<T>): T[] => [...iter];

describe("IntoIter limit", () => {
  describe("forward", () => {
    it("takes the first elements of a range", () => {
      expect(collect(intoIter(10).limit(3))).toEqual([0, 1, 2]);
    });

    it("takes the first elements of an array", () => {
      expect(collect(intoIter([1, 2, 3, 4]).limit(2))).toEqual([1, 2]);
    });

    it("takes the first characters of a string", () => {
      expect(collect(intoIter("abcdef").limit(3))).toEqual(["a", "b", "c"]);
    });

    it("takes the first elements of a Set", () => {
      expect(collect(intoIter(new Set([1, 2, 3])).limit(2))).toEqual([1, 2]);
    });

    it("yields the whole source when the limit is larger", () => {
      expect(collect(intoIter([1, 2, 3]).limit(10))).toEqual([1, 2, 3]);
    });

    it("yields the whole source when the limit equals its length", () => {
      expect(collect(intoIter([1, 2, 3]).limit(3))).toEqual([1, 2, 3]);
    });

    it("yields nothing for a zero limit", () => {
      expect(collect(intoIter([1, 2, 3]).limit(0))).toEqual([]);
    });

    it("throws TypeError for a negative limit", () => {
      expect(() => intoIter([1, 2, 3]).limit(-1)).toThrow(new TypeError("Limit must be a positive integer"));
    });

    it("throws TypeError for a NaN limit", () => {
      expect(() => intoIter([1, 2, 3]).limit(Number.NaN)).toThrow(new TypeError("Limit must be a positive integer"));
    });

    it("yields nothing for an empty source", () => {
      expect(collect(intoIter([]).limit(3))).toEqual([]);
    });

    it("applies the smallest of chained limits", () => {
      expect(collect(intoIter(10).limit(5).limit(2))).toEqual([0, 1]);
      expect(collect(intoIter(10).limit(2).limit(5))).toEqual([0, 1]);
    });

    it("stays done after exhaustion", () => {
      const cursor = intoIter([1, 2, 3]).limit(1)[Symbol.iterator]();

      cursor.next();

      expect(cursor.next()).toEqual({ done: true, value: undefined });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
    });
  });

  describe("laziness", () => {
    it("does not open the source until iteration starts", () => {
      const calls: number[] = [];

      intoIter([1, 2, 3])
        .map((n) => {
          calls.push(n);
          return n;
        })
        .limit(2);

      expect(calls).toEqual([]);
    });

    it("does not pull elements past the limit", () => {
      const calls: number[] = [];
      const iter = intoIter(100)
        .map((n) => {
          calls.push(n);
          return n;
        })
        .limit(3);

      expect(collect(iter)).toEqual([0, 1, 2]);
      expect(calls).toEqual([0, 1, 2]);
    });

    it("stops an infinite generator", () => {
      let yielded = 0;
      function* naturals() {
        for (let n = 0; ; n++) {
          yielded++;
          yield n;
        }
      }

      expect(collect(intoIter(naturals()).limit(3))).toEqual([0, 1, 2]);
      expect(yielded).toBe(3);
    });

    it("pulls only until the filtered elements are found", () => {
      const calls: number[] = [];
      const iter = intoIter(100)
        .filter((n) => {
          calls.push(n);
          return n % 3 === 0;
        })
        .limit(2);

      expect(collect(iter)).toEqual([0, 3]);
      expect(calls).toEqual([0, 1, 2, 3]);
    });
  });

  describe("view semantics", () => {
    it("reads the limited view again from the start", () => {
      const iter = intoIter([1, 2, 3, 4]).limit(2);

      expect(collect(iter)).toEqual([1, 2]);
      expect(collect(iter)).toEqual([1, 2]);
    });

    it("does not change the original iterator", () => {
      const source = intoIter(5);

      expect(collect(source.limit(2))).toEqual([0, 1]);
      expect(collect(source)).toEqual([0, 1, 2, 3, 4]);
    });

    it("keeps two limited views independent", () => {
      const source = intoIter(10);
      const first = source.limit(2)[Symbol.iterator]();
      const second = source.limit(3)[Symbol.iterator]();

      expect(first.next().value).toBe(0);
      expect(first.next().value).toBe(1);
      expect(second.next().value).toBe(0);
      expect(first.next().done).toBe(true);
    });
  });

  describe("remaining", () => {
    it("reports the limit when the source is longer", () => {
      expect(intoIter(10).limit(3)[Symbol.iterator]().remaining?.()).toBe(3);
    });

    it("reports the source length when the limit is larger", () => {
      expect(intoIter(3).limit(10)[Symbol.iterator]().remaining?.()).toBe(3);
    });

    it("reports the array length when the limit is larger", () => {
      expect(intoIter([1, 2, 3]).limit(10)[Symbol.iterator]().remaining?.()).toBe(3);
    });

    it("decreases while consuming from both ends", () => {
      const cursor = intoIter(10).limit(4)[Symbol.iterator]();

      cursor.next();
      expect(cursor.remaining?.()).toBe(3);
      cursor.nextBack?.();
      expect(cursor.remaining?.()).toBe(2);
    });

    it("reports zero for a zero limit", () => {
      expect(intoIter(10).limit(0)[Symbol.iterator]().remaining?.()).toBe(0);
    });

    it("is preserved through map", () => {
      expect(
        intoIter(10)
          .map((n) => n * 2)
          .limit(3)
          [Symbol.iterator]()
          .remaining?.(),
      ).toBe(3);
    });

    it("is absent after filter", () => {
      expect(
        intoIter(10)
          .filter(() => true)
          .limit(3)
          [Symbol.iterator]().remaining,
      ).toBeUndefined();
    });

    it("is absent for a source of unknown length", () => {
      expect(
        intoIter(new Set([1, 2, 3]))
          .limit(2)
          [Symbol.iterator]().remaining,
      ).toBeUndefined();
    });
  });

  describe("reversed after limit", () => {
    it("walks the first elements of a range from the back", () => {
      expect(collect(intoIter(10).limit(3).reversed)).toEqual([2, 1, 0]);
    });

    it("walks the first elements of an array from the back", () => {
      expect(collect(intoIter([1, 2, 3, 4]).limit(2).reversed)).toEqual([2, 1]);
    });

    it("walks the first characters of a string from the back", () => {
      expect(collect(intoIter("abcdef").limit(3).reversed)).toEqual(["c", "b", "a"]);
    });

    it("walks a mapped range from the back", () => {
      expect(
        collect(
          intoIter(10)
            .map((n) => n + 2)
            .limit(2).reversed,
        ),
      ).toEqual([3, 2]);
    });

    it("walks the whole source from the back when the limit is larger", () => {
      expect(collect(intoIter(3).limit(10).reversed)).toEqual([2, 1, 0]);
      expect(collect(intoIter([1, 2, 3]).limit(10).reversed)).toEqual([3, 2, 1]);
    });

    it("yields nothing for a zero limit", () => {
      expect(collect(intoIter(10).limit(0).reversed)).toEqual([]);
    });

    it("takes the window of a large range", () => {
      expect(
        collect(
          intoIter(1_000_000)
            .map((n) => n * n)
            .limit(3).reversed,
        ),
      ).toEqual([4, 1, 0]);
    });

    it("restores the original order when reversed twice", () => {
      expect(collect(intoIter(10).limit(3).reversed.reversed)).toEqual([0, 1, 2]);
    });

    it("throws after filter because the length is unknown", () => {
      expect(() =>
        collect(
          intoIter(10)
            .filter(() => true)
            .limit(3).reversed,
        ),
      ).toThrow("Cannot walk backwards");
    });

    it("throws for a source of unknown length", () => {
      expect(() => collect(intoIter(new Set([1, 2, 3])).limit(2).reversed)).toThrow("Cannot walk backwards");
    });
  });

  describe("limit after reversed", () => {
    it("takes the last elements of a range", () => {
      expect(collect(intoIter(10).reversed.limit(3))).toEqual([9, 8, 7]);
    });

    it("takes the last matching elements after filter", () => {
      expect(
        collect(
          intoIter(20)
            .filter((n) => n % 7 === 0)
            .reversed.limit(2),
        ),
      ).toEqual([14, 7]);
    });

    it("takes the last elements in the original order", () => {
      expect(collect(intoIter(10).reversed.limit(3).reversed)).toEqual([7, 8, 9]);
    });
  });

  describe("mixed next and nextBack", () => {
    it("consumes the window from both ends without overlap", () => {
      const cursor = intoIter(10).limit(4)[Symbol.iterator]();

      expect(cursor.next().value).toBe(0);
      expect(cursor.nextBack?.().value).toBe(3);
      expect(cursor.next().value).toBe(1);
      expect(cursor.nextBack?.().value).toBe(2);
      expect(cursor.next().done).toBe(true);
      expect(cursor.nextBack?.().done).toBe(true);
    });

    it("does not go past the window after taking from the front", () => {
      const cursor = intoIter([1, 2, 3, 4, 5]).limit(3)[Symbol.iterator]();

      expect(cursor.next().value).toBe(1);
      expect(cursor.nextBack?.().value).toBe(3);
      expect(cursor.nextBack?.().value).toBe(2);
      expect(cursor.nextBack?.().done).toBe(true);
      expect(cursor.next().done).toBe(true);
    });
  });
});
