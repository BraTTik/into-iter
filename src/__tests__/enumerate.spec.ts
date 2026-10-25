import { describe, it, expect } from "@jest/globals";
import "../enumerate.js";
import "../filter.js";
import "../limit.js";
import "../map.js";
import "../skip.js";
import { intoIter } from "../into-iter-factory.js";

const collect = <T>(iter: Iterable<T>): T[] => [...iter];

describe("IntoIter enumerate", () => {
  describe("forward", () => {
    it("numbers an array from zero", () => {
      expect(collect(intoIter(["a", "b", "c"]).enumerate())).toEqual([
        [0, "a"],
        [1, "b"],
        [2, "c"],
      ]);
    });

    it("numbers a range from zero", () => {
      expect(collect(intoIter(3).enumerate())).toEqual([
        [0, 0],
        [1, 1],
        [2, 2],
      ]);
    });

    it("numbers a string by code units", () => {
      expect(collect(intoIter("ab").enumerate())).toEqual([
        [0, "a"],
        [1, "b"],
      ]);
    });

    it("numbers a Set in iteration order", () => {
      expect(collect(intoIter(new Set(["a", "b"])).enumerate())).toEqual([
        [0, "a"],
        [1, "b"],
      ]);
    });

    it("numbers a single element", () => {
      expect(collect(intoIter(["only"]).enumerate())).toEqual([[0, "only"]]);
    });

    it("yields nothing for an empty source", () => {
      expect(collect(intoIter<string>([]).enumerate())).toEqual([]);
    });

    it("starts again after filter and skip", () => {
      expect(
        collect(
          intoIter([1, 2, 3, 4])
            .filter((n) => n % 2 === 0)
            .enumerate(),
        ),
      ).toEqual([
        [0, 2],
        [1, 4],
      ]);
      expect(collect(intoIter(["a", "b", "c", "d"]).skip(2).enumerate())).toEqual([
        [0, "c"],
        [1, "d"],
      ]);
    });

    it("keeps the original indexes when enumerated values are filtered", () => {
      expect(
        collect(
          intoIter(["a", "b", "c", "d"])
            .enumerate()
            .filter(([, value]) => value === "b" || value === "d"),
        ),
      ).toEqual([
        [1, "b"],
        [3, "d"],
      ]);
    });

    it("stays done after exhaustion", () => {
      const cursor = intoIter(["a"]).enumerate()[Symbol.iterator]();

      cursor.next();

      expect(cursor.next()).toEqual({ done: true, value: undefined });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
    });
  });

  describe("laziness", () => {
    it("does not read the source until iteration starts", () => {
      const calls: number[] = [];

      intoIter([1, 2, 3])
        .map((n) => {
          calls.push(n);
          return n;
        })
        .enumerate();

      expect(calls).toEqual([]);
    });

    it("numbers only consumed elements", () => {
      const calls: number[] = [];
      const cursor = intoIter([1, 2, 3, 4])
        .map((n) => {
          calls.push(n);
          return n;
        })
        .enumerate()
        [Symbol.iterator]();

      expect(cursor.next().value).toEqual([0, 1]);
      expect(calls).toEqual([1]);
      expect(cursor.next().value).toEqual([1, 2]);
      expect(calls).toEqual([1, 2]);
    });
  });

  describe("view semantics", () => {
    it("starts numbering from zero on the next read", () => {
      const iter = intoIter(["a", "b"]).enumerate();

      expect(collect(iter)).toEqual([
        [0, "a"],
        [1, "b"],
      ]);
      expect(collect(iter)).toEqual([
        [0, "a"],
        [1, "b"],
      ]);
    });

    it("does not change the original iterator", () => {
      const source = intoIter(["a", "b"]);

      expect(collect(source.enumerate())).toEqual([
        [0, "a"],
        [1, "b"],
      ]);
      expect(collect(source)).toEqual(["a", "b"]);
    });

    it("keeps two enumerated views independent", () => {
      const source = intoIter(["a", "b", "c"]);
      const first = source.enumerate()[Symbol.iterator]();
      const second = source.enumerate()[Symbol.iterator]();

      expect(first.next().value).toEqual([0, "a"]);
      expect(first.next().value).toEqual([1, "b"]);
      expect(second.next().value).toEqual([0, "a"]);
    });
  });

  describe("remaining", () => {
    it("reports the source length", () => {
      expect(intoIter(10).enumerate()[Symbol.iterator]().remaining?.()).toBe(10);
      expect(intoIter(["a", "b", "c"]).enumerate()[Symbol.iterator]().remaining?.()).toBe(3);
    });

    it("decreases while consuming from both ends", () => {
      const cursor = intoIter(["a", "b", "c", "d"]).enumerate()[Symbol.iterator]();

      cursor.next();
      expect(cursor.remaining?.()).toBe(3);
      cursor.nextBack?.();
      expect(cursor.remaining?.()).toBe(2);
    });

    it("is absent after filter", () => {
      expect(
        intoIter([1, 2, 3])
          .filter(() => true)
          .enumerate()
          [Symbol.iterator]().remaining,
      ).toBeUndefined();
    });
  });

  describe("reversed", () => {
    it("numbers a reversed source from zero", () => {
      expect(collect(intoIter([1, 2, 3, 4]).reversed.enumerate())).toEqual([
        [0, 4],
        [1, 3],
        [2, 2],
        [3, 1],
      ]);
    });

    it("reverses pairs that were already numbered", () => {
      expect(collect(intoIter(["a", "b", "c"]).enumerate().reversed)).toEqual([
        [2, "c"],
        [1, "b"],
        [0, "a"],
      ]);
    });

    it("keeps the original indexes of a range", () => {
      expect(collect(intoIter(4).enumerate().reversed)).toEqual([
        [3, 3],
        [2, 2],
        [1, 1],
        [0, 0],
      ]);
    });

    it("numbers the skipped tail from zero when reversed", () => {
      expect(collect(intoIter(["a", "b", "c", "d"]).skip(2).enumerate().reversed)).toEqual([
        [1, "d"],
        [0, "c"],
      ]);
    });

    it("reverses the first enumerated pairs", () => {
      expect(collect(intoIter([10, 20, 30, 40]).enumerate().limit(2).reversed)).toEqual([
        [1, 20],
        [0, 10],
      ]);
    });

    it("throws after filter because the length is unknown", () => {
      expect(() =>
        collect(
          intoIter([1, 2, 3])
            .filter(() => true)
            .enumerate().reversed,
        ),
      ).toThrow("Cannot walk backwards");
    });

    it("throws when the source cannot be read from the back", () => {
      expect(() => collect(intoIter(new Set([1, 2])).enumerate().reversed)).toThrow("Cannot walk backwards");
    });
  });

  describe("mixed next and nextBack", () => {
    it("assigns indexes from the position, not the visit order", () => {
      const cursor = intoIter(["a", "b", "c", "d"]).enumerate()[Symbol.iterator]();

      expect(cursor.next().value).toEqual([0, "a"]);
      expect(cursor.nextBack?.().value).toEqual([3, "d"]);
      expect(cursor.next().value).toEqual([1, "b"]);
      expect(cursor.nextBack?.().value).toEqual([2, "c"]);
      expect(cursor.next().done).toBe(true);
      expect(cursor.nextBack?.().done).toBe(true);
    });
  });
});
