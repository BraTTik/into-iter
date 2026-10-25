import { describe, it, expect } from "@jest/globals";
import "../flat-map.js";
import "../limit.js";
import "../map.js";
import "../skip.js";
import { intoIter } from "../into-iter-factory.js";

const collect = <T>(iter: Iterable<T>): T[] => [...iter];

describe("IntoIter filterMap", () => {
  describe("forward", () => {
    it("keeps transformed values and skips undefined", () => {
      expect(
        collect(
          intoIter(["1", "x", "2"]).filterMap((s) => {
            const n = Number(s);
            return Number.isNaN(n) ? undefined : n;
          }),
        ),
      ).toEqual([1, 2]);
    });

    it("skips null as well as undefined", () => {
      expect(collect(intoIter([1, 2, 3]).filterMap((n) => (n === 2 ? null : n)))).toEqual([1, 3]);
    });

    it("keeps falsy values other than null and undefined", () => {
      expect(collect(intoIter([0, false, "", 1]).filterMap((value) => value))).toEqual([0, false, "", 1]);
    });

    it("returns a produced array as one element", () => {
      expect(collect(intoIter([1]).filterMap(() => [1, 2]))).toEqual([[1, 2]]);
    });

    it("yields nothing when every value is skipped", () => {
      expect(collect(intoIter([1, 2, 3]).filterMap(() => undefined))).toEqual([]);
    });

    it("yields nothing for an empty source", () => {
      expect(collect(intoIter<number>([]).filterMap((n) => n))).toEqual([]);
    });

    it("reads a string source", () => {
      expect(
        collect(intoIter("a1b2").filterMap((char) => (char >= "0" && char <= "9" ? Number(char) : undefined))),
      ).toEqual([1, 2]);
    });

    it("reads a Set source", () => {
      expect(collect(intoIter(new Set([1, 2, 3])).filterMap((n) => (n % 2 === 0 ? n * 10 : undefined)))).toEqual([20]);
    });

    it("stays done after exhaustion", () => {
      const cursor = intoIter([1, 2])
        .filterMap((n) => (n === 1 ? n : undefined))
        [Symbol.iterator]();

      cursor.next();

      expect(cursor.next()).toEqual({ done: true, value: undefined });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
    });
  });

  describe("laziness", () => {
    it("does not call the function until iteration starts", () => {
      const calls: number[] = [];

      intoIter([1, 2, 3]).filterMap((n) => {
        calls.push(n);
        return n;
      });

      expect(calls).toEqual([]);
    });

    it("calls the function only until the requested value is found", () => {
      const calls: number[] = [];
      const cursor = intoIter([1, 2, 3, 4])
        .filterMap((n) => {
          calls.push(n);
          return n % 2 === 0 ? n : undefined;
        })
        [Symbol.iterator]();

      expect(cursor.next().value).toBe(2);
      expect(calls).toEqual([1, 2]);
      expect(cursor.next().value).toBe(4);
      expect(calls).toEqual([1, 2, 3, 4]);
    });

    it("does not read past a following limit", () => {
      const calls: number[] = [];

      expect(
        collect(
          intoIter([1, 2, 3, 4, 5])
            .filterMap((n) => {
              calls.push(n);
              return n % 2 === 0 ? n : undefined;
            })
            .limit(1),
        ),
      ).toEqual([2]);
      expect(calls).toEqual([1, 2]);
    });
  });

  describe("view semantics", () => {
    it("reads the same view again from the start", () => {
      const iter = intoIter([1, 2, 3]).filterMap((n) => (n % 2 === 0 ? n * 10 : undefined));

      expect(collect(iter)).toEqual([20]);
      expect(collect(iter)).toEqual([20]);
    });

    it("calls the function again on the next read", () => {
      const calls: number[] = [];
      const iter = intoIter([1, 2]).filterMap((n) => {
        calls.push(n);
        return n;
      });

      collect(iter);
      collect(iter);

      expect(calls).toEqual([1, 2, 1, 2]);
    });

    it("does not change the original iterator", () => {
      const source = intoIter([1, 2, 3]);

      expect(collect(source.filterMap((n) => (n > 1 ? n : undefined)))).toEqual([2, 3]);
      expect(collect(source)).toEqual([1, 2, 3]);
    });
  });

  describe("remaining", () => {
    it("does not report a length", () => {
      expect(
        intoIter([1, 2, 3])
          .filterMap((n) => n)
          [Symbol.iterator]().remaining,
      ).toBeUndefined();
    });
  });

  describe("with other adapters", () => {
    it("maps before filtering", () => {
      expect(
        collect(
          intoIter([1, 2, 3])
            .map((n) => n * 10)
            .filterMap((n) => (n === 20 ? undefined : n)),
        ),
      ).toEqual([10, 30]);
    });

    it("skips kept values", () => {
      expect(
        collect(
          intoIter([1, 2, 3, 4])
            .filterMap((n) => (n % 2 === 0 ? n : undefined))
            .skip(1),
        ),
      ).toEqual([4]);
    });

    it("limits kept values", () => {
      expect(
        collect(
          intoIter([1, 2, 3, 4, 5, 6])
            .filterMap((n) => (n % 2 === 0 ? n : undefined))
            .limit(2),
        ),
      ).toEqual([2, 4]);
    });

    it("throws when the limited window is reversed because the length is unknown", () => {
      expect(() =>
        collect(
          intoIter([1, 2, 3, 4])
            .filterMap((n) => n)
            .limit(2).reversed,
        ),
      ).toThrow("Cannot walk backwards");
    });
  });

  describe("reversed", () => {
    it("walks kept values from the back", () => {
      expect(collect(intoIter([1, 2, 3, 4, 5]).filterMap((n) => (n % 2 === 0 ? n * 10 : undefined)).reversed)).toEqual([
        40, 20,
      ]);
    });

    it("skips rejected values at the back", () => {
      expect(collect(intoIter([1, 2, 3]).filterMap((n) => (n === 3 ? undefined : n)).reversed)).toEqual([2, 1]);
    });

    it("takes the last kept values", () => {
      expect(
        collect(
          intoIter([1, 2, 3, 4, 5, 6])
            .filterMap((n) => (n % 2 === 0 ? n : undefined))
            .reversed.limit(2),
        ),
      ).toEqual([6, 4]);
    });

    it("calls the function only until the last kept value is found", () => {
      const calls: number[] = [];
      const cursor = intoIter([1, 2, 3, 4, 5])
        .filterMap((n) => {
          calls.push(n);
          return n % 2 === 0 ? n : undefined;
        })
        .reversed[Symbol.iterator]();

      expect(cursor.next().value).toBe(4);
      expect(calls).toEqual([5, 4]);
    });

    it("restores the original order when reversed twice", () => {
      expect(collect(intoIter([1, 2, 3, 4]).filterMap((n) => (n % 2 === 0 ? n : undefined)).reversed.reversed)).toEqual(
        [2, 4],
      );
    });

    it("throws when the source cannot be read from the back", () => {
      expect(() => collect(intoIter(new Set([1, 2, 3])).filterMap((n) => n).reversed)).toThrow("Cannot walk backwards");
    });
  });

  describe("mixed next and nextBack", () => {
    it("reads kept values from both ends", () => {
      const cursor = intoIter([1, 2, 3, 4])
        .filterMap((n) => n)
        [Symbol.iterator]();

      expect(cursor.next().value).toBe(1);
      expect(cursor.nextBack?.().value).toBe(4);
      expect(cursor.next().value).toBe(2);
      expect(cursor.nextBack?.().value).toBe(3);
      expect(cursor.next().done).toBe(true);
      expect(cursor.nextBack?.().done).toBe(true);
    });
  });
});
