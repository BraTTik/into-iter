import { describe, it, expect } from "@jest/globals";
import "../map.js";
import "../skip-while.js";
import { intoIter } from "../into-iter-factory.js";

const read = <T>(iter: Iterable<T>): T[] => [...iter];

describe("IntoIter skipWhile", () => {
  describe("forward", () => {
    it("drops the prefix and yields the rest, including the first failure", () => {
      expect(read(intoIter([1, 2, 5, 3]).skipWhile((n) => n < 4))).toEqual([5, 3]);
      expect(read(intoIter("abcde").skipWhile((char) => char < "d"))).toEqual(["d", "e"]);
    });

    it("yields the whole source when the first element fails", () => {
      const calls: number[] = [];

      expect(
        read(
          intoIter([5, 1, 2]).skipWhile((n) => {
            calls.push(n);
            return n < 4;
          }),
        ),
      ).toEqual([5, 1, 2]);
      expect(calls).toStrictEqual([5]);
    });

    it("yields nothing when every element matches and does not call the predicate past the end", () => {
      const calls: number[] = [];

      expect(
        read(
          intoIter([1, 2, 3]).skipWhile((n) => {
            calls.push(n);
            return n < 10;
          }),
        ),
      ).toEqual([]);
      expect(calls).toStrictEqual([1, 2, 3]);
    });

    it("yields nothing for an empty source and does not call the predicate", () => {
      const calls: number[] = [];

      expect(
        read(
          intoIter<number>([]).skipWhile((n) => {
            calls.push(n);
            return n > 0;
          }),
        ),
      ).toEqual([]);
      expect(calls).toHaveLength(0);
    });

    it("drops falsy values that match and keeps the first failure", () => {
      expect(read(intoIter([0, 1, 2]).skipWhile((n) => n < 2))).toEqual([2]);
      expect(read(intoIter([false, "", "stop", true]).skipWhile((value) => value !== "stop"))).toEqual(["stop", true]);
    });

    it("yields later elements even when they would match the predicate", () => {
      const calls: number[] = [];

      expect(
        read(
          intoIter([1, 5, 2]).skipWhile((n) => {
            calls.push(n);
            return n < 4;
          }),
        ),
      ).toEqual([5, 2]);
      expect(calls).toStrictEqual([1, 5]);
    });
  });

  describe("cursor", () => {
    it("keeps yielding after the first failure", () => {
      const cursor = intoIter([1, 2, 5, 3, 0])
        .skipWhile((n) => n < 4)
        [Symbol.iterator]();

      expect(cursor.next()).toEqual({ done: false, value: 5 });
      expect(cursor.next()).toEqual({ done: false, value: 3 });
      expect(cursor.next()).toEqual({ done: false, value: 0 });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
    });

    it("does not call the predicate after the source ends", () => {
      const calls: number[] = [];
      const cursor = intoIter([1, 2])
        .skipWhile((n) => {
          calls.push(n);
          return n < 4;
        })
        [Symbol.iterator]();

      expect(cursor.next()).toEqual({ done: true, value: undefined });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
      expect(calls).toStrictEqual([1, 2]);
    });

    it("has no backward step and no known length", () => {
      const cursor = intoIter([1, 2, 3])
        .skipWhile(() => false)
        [Symbol.iterator]();

      expect(cursor.nextBack).toBeUndefined();
      expect(cursor.remaining).toBeUndefined();
    });
  });

  describe("laziness", () => {
    it("does not read the source until iteration starts", () => {
      const calls: number[] = [];
      const values = intoIter([1, 2, 5, 3])
        .map((n) => {
          calls.push(n);
          return n;
        })
        .skipWhile((n) => n < 4);

      expect(calls).toEqual([]);
      expect(read(values)).toEqual([5, 3]);
    });

    it("does not read past the element that was requested", () => {
      let pulls = 0;
      function* values() {
        for (const n of [1, 2, 5, 3, 4]) {
          pulls += 1;
          yield n;
        }
      }

      const cursor = intoIter(values())
        .skipWhile((n) => n < 4)
        [Symbol.iterator]();

      expect(cursor.next()).toEqual({ done: false, value: 5 });
      expect(pulls).toBe(3);
      expect(cursor.next()).toEqual({ done: false, value: 3 });
      expect(pulls).toBe(4);
    });
  });

  describe("reversed", () => {
    it("skips from the back when reversed comes first", () => {
      expect(read(intoIter([1, 2, 5, 3]).reversed.skipWhile((n) => n < 4))).toEqual([5, 2, 1]);
      expect(read(intoIter([1, 2, 3]).reversed.skipWhile((n) => n > 1))).toEqual([1]);
    });

    it("throws when reversed comes after skipWhile", () => {
      const values = intoIter([1, 2, 3]).skipWhile((n) => n < 3).reversed;

      expect(() => read(values)).toThrow("Cannot walk backwards");
    });
  });

  describe("replay", () => {
    it("leaves the source readable", () => {
      const source = intoIter([1, 2, 5, 3]);

      expect(read(source.skipWhile((n) => n < 4))).toEqual([5, 3]);
      expect(read(source.skipWhile((n) => n < 4))).toEqual([5, 3]);
      expect(read(source)).toEqual([1, 2, 5, 3]);
    });
  });

  describe("types", () => {
    it("checks the predicate against the element type", () => {
      const numbers = intoIter([1, 2, 3]);

      // @ts-expect-error predicate receives numbers
      numbers.skipWhile((s: string) => s.length > 0);
    });
  });
});
