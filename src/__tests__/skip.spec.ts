import { describe, it, expect } from "@jest/globals";
import "../filter.js";
import "../map.js";
import "../limit.js";
import "../skip.js";
import { intoIter } from "../into-iter-factory.js";

const collect = <T>(iter: Iterable<T>): T[] => [...iter];

const skipError = new TypeError("Skip must be a non-negative integer");

describe("IntoIter skip", () => {
  describe("forward", () => {
    it("drops the first elements of a range", () => {
      expect(collect(intoIter(10).skip(3))).toEqual([3, 4, 5, 6, 7, 8, 9]);
    });

    it("drops the first elements of an array", () => {
      expect(collect(intoIter([1, 2, 3, 4]).skip(2))).toEqual([3, 4]);
    });

    it("drops the first characters of a string", () => {
      expect(collect(intoIter("abcdef").skip(3))).toEqual(["d", "e", "f"]);
    });

    it("drops the first elements of a Set", () => {
      expect(collect(intoIter(new Set([1, 2, 3])).skip(2))).toEqual([3]);
    });

    it("yields the whole source when the count is zero", () => {
      expect(collect(intoIter([1, 2, 3]).skip(0))).toEqual([1, 2, 3]);
    });

    it("yields nothing when the count equals the length", () => {
      expect(collect(intoIter([1, 2, 3]).skip(3))).toEqual([]);
    });

    it("yields nothing when the count is larger than the length", () => {
      expect(collect(intoIter([1, 2, 3]).skip(10))).toEqual([]);
    });

    it("yields nothing for an empty source", () => {
      expect(collect(intoIter([]).skip(3))).toEqual([]);
    });

    it("adds chained skips", () => {
      expect(collect(intoIter(10).skip(2).skip(3))).toEqual([5, 6, 7, 8, 9]);
      expect(collect(intoIter(10).skip(3).skip(2))).toEqual([5, 6, 7, 8, 9]);
    });

    it("throws TypeError for a negative count", () => {
      expect(() => intoIter([1, 2, 3]).skip(-1)).toThrow(skipError);
    });

    it("throws TypeError for a fractional count", () => {
      expect(() => intoIter([1, 2, 3]).skip(2.5)).toThrow(skipError);
    });

    it("throws TypeError for a NaN count", () => {
      expect(() => intoIter([1, 2, 3]).skip(Number.NaN)).toThrow(skipError);
    });

    it("stays done after exhaustion", () => {
      const cursor = intoIter([1, 2, 3]).skip(2)[Symbol.iterator]();

      cursor.next();

      expect(cursor.next()).toEqual({ done: true, value: undefined });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
    });

    it("stays done when the count is larger than the source", () => {
      const cursor = intoIter([1, 2]).skip(5)[Symbol.iterator]();

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
        .skip(2);

      expect(calls).toEqual([]);
    });

    it("pulls the skipped elements and the requested one", () => {
      const calls: number[] = [];
      const cursor = intoIter(100)
        .map((n) => {
          calls.push(n);
          return n;
        })
        .skip(3)
        [Symbol.iterator]();

      expect(cursor.next().value).toBe(3);
      expect(calls).toEqual([0, 1, 2, 3]);
    });

    it("does not pull past a following limit", () => {
      const calls: number[] = [];
      const iter = intoIter(100)
        .map((n) => {
          calls.push(n);
          return n;
        })
        .skip(3)
        .limit(2);

      expect(collect(iter)).toEqual([3, 4]);
      expect(calls).toEqual([0, 1, 2, 3, 4]);
    });

    it("stops an infinite generator", () => {
      let yielded = 0;
      function* naturals() {
        for (let n = 0; ; n++) {
          yielded++;
          yield n;
        }
      }

      expect(collect(intoIter(naturals()).skip(2).limit(3))).toEqual([2, 3, 4]);
      expect(yielded).toBe(5);
    });

    it("pulls only until the skipped matches are found", () => {
      const calls: number[] = [];
      const cursor = intoIter(100)
        .filter((n) => {
          calls.push(n);
          return n % 3 === 0;
        })
        .skip(2)
        [Symbol.iterator]();

      expect(cursor.next().value).toBe(6);
      expect(calls).toEqual([0, 1, 2, 3, 4, 5, 6]);
    });
  });

  describe("view semantics", () => {
    it("reads the skipped view again from the start", () => {
      const iter = intoIter([1, 2, 3, 4]).skip(2);

      expect(collect(iter)).toEqual([3, 4]);
      expect(collect(iter)).toEqual([3, 4]);
    });

    it("does not change the original iterator", () => {
      const source = intoIter(5);

      expect(collect(source.skip(2))).toEqual([2, 3, 4]);
      expect(collect(source)).toEqual([0, 1, 2, 3, 4]);
    });

    it("keeps two skipped views independent", () => {
      const source = intoIter(10);
      const first = source.skip(2)[Symbol.iterator]();
      const second = source.skip(4)[Symbol.iterator]();

      expect(first.next().value).toBe(2);
      expect(second.next().value).toBe(4);
      expect(first.next().value).toBe(3);
    });
  });

  describe("remaining", () => {
    it("reports the length minus the skipped count", () => {
      expect(intoIter(10).skip(3)[Symbol.iterator]().remaining?.()).toBe(7);
    });

    it("reports the full length for a zero count", () => {
      expect(intoIter(10).skip(0)[Symbol.iterator]().remaining?.()).toBe(10);
    });

    it("reports zero when the count is larger than the source", () => {
      expect(intoIter(3).skip(10)[Symbol.iterator]().remaining?.()).toBe(0);
      expect(intoIter([1, 2, 3]).skip(10)[Symbol.iterator]().remaining?.()).toBe(0);
    });

    it("decreases while consuming from both ends", () => {
      const cursor = intoIter(10).skip(3)[Symbol.iterator]();

      expect(cursor.remaining?.()).toBe(7);
      cursor.next();
      expect(cursor.remaining?.()).toBe(6);
      cursor.nextBack?.();
      expect(cursor.remaining?.()).toBe(5);
    });

    it("is preserved through map", () => {
      expect(
        intoIter(10)
          .map((n) => n * 2)
          .skip(3)
          [Symbol.iterator]()
          .remaining?.(),
      ).toBe(7);
    });

    it("is absent after filter", () => {
      expect(
        intoIter(10)
          .filter(() => true)
          .skip(3)
          [Symbol.iterator]().remaining,
      ).toBeUndefined();
    });

    it("is absent for a source of unknown length", () => {
      expect(
        intoIter(new Set([1, 2, 3]))
          .skip(1)
          [Symbol.iterator]().remaining,
      ).toBeUndefined();
    });
  });

  describe("reversed after skip", () => {
    it("walks the tail of a range from the back", () => {
      expect(collect(intoIter(10).skip(3).reversed)).toEqual([9, 8, 7, 6, 5, 4, 3]);
    });

    it("walks the tail of an array from the back", () => {
      expect(collect(intoIter([1, 2, 3, 4]).skip(1).reversed)).toEqual([4, 3, 2]);
    });

    it("walks the tail of a string from the back", () => {
      expect(collect(intoIter("abcdef").skip(3).reversed)).toEqual(["f", "e", "d"]);
    });

    it("walks a mapped range from the back", () => {
      expect(
        collect(
          intoIter(10)
            .map((n) => n + 2)
            .skip(8).reversed,
        ),
      ).toEqual([11, 10]);
    });

    it("yields nothing when the count covers the source", () => {
      expect(collect(intoIter(3).skip(10).reversed)).toEqual([]);
      expect(collect(intoIter([1, 2, 3]).skip(3).reversed)).toEqual([]);
    });

    it("returns the last element of a large range immediately", () => {
      const calls: number[] = [];
      const cursor = intoIter(1_000_000)
        .map((n) => {
          calls.push(n);
          return n;
        })
        .skip(999_997)
        .reversed[Symbol.iterator]();

      expect(cursor.next()).toEqual({ done: false, value: 999_999 });
      expect(calls).toEqual([999_999]);
    });

    it("restores the original order when reversed twice", () => {
      expect(collect(intoIter(10).skip(3).reversed.reversed)).toEqual([3, 4, 5, 6, 7, 8, 9]);
    });

    it("throws after filter because the length is unknown", () => {
      expect(() =>
        collect(
          intoIter(10)
            .filter(() => true)
            .skip(3).reversed,
        ),
      ).toThrow("Cannot walk backwards");
    });

    it("throws for a source of unknown length", () => {
      expect(() => collect(intoIter(new Set([1, 2, 3])).skip(1).reversed)).toThrow("Cannot walk backwards");
    });
  });

  describe("skip after reversed", () => {
    it("drops the last elements of a range", () => {
      expect(collect(intoIter(10).reversed.skip(3))).toEqual([6, 5, 4, 3, 2, 1, 0]);
    });

    it("drops the last matching elements after filter", () => {
      expect(
        collect(
          intoIter(20)
            .filter((n) => n % 7 === 0)
            .reversed.skip(1),
        ),
      ).toEqual([7, 0]);
    });

    it("drops the last elements and restores the original order", () => {
      expect(collect(intoIter(10).reversed.skip(3).reversed)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    });
  });

  describe("with limit", () => {
    it("limits the tail", () => {
      expect(collect(intoIter(10).skip(3).limit(2))).toEqual([3, 4]);
    });

    it("skips inside a limited window", () => {
      expect(collect(intoIter(10).limit(5).skip(3))).toEqual([3, 4]);
    });

    it("reverses the limited tail", () => {
      expect(collect(intoIter(10).skip(3).limit(2).reversed)).toEqual([4, 3]);
    });
  });

  describe("mixed next and nextBack", () => {
    it("keeps the skipped prefix out of both ends", () => {
      const cursor = intoIter(10).skip(3)[Symbol.iterator]();

      expect(cursor.next().value).toBe(3);
      expect(cursor.nextBack?.().value).toBe(9);
      expect(cursor.next().value).toBe(4);
      expect(cursor.nextBack?.().value).toBe(8);
      expect(cursor.next().value).toBe(5);
      expect(cursor.next().value).toBe(6);
      expect(cursor.next().value).toBe(7);
      expect(cursor.next().done).toBe(true);
      expect(cursor.nextBack?.().done).toBe(true);
    });

    it("still skips the prefix after taking from the back", () => {
      const cursor = intoIter([1, 2, 3, 4, 5]).skip(2)[Symbol.iterator]();

      expect(cursor.nextBack?.().value).toBe(5);
      expect(cursor.next().value).toBe(3);
      expect(cursor.next().value).toBe(4);
      expect(cursor.next().done).toBe(true);
      expect(cursor.nextBack?.().done).toBe(true);
    });
  });
});
