import { describe, it, expect } from "@jest/globals";
import "../map.js";
import "../take-while.js";
import { intoIter } from "../into-iter-factory.js";

const read = <T>(iter: Iterable<T>): T[] => [...iter];

describe("IntoIter takeWhile", () => {
  describe("forward", () => {
    it("yields the prefix while the predicate holds", () => {
      expect(read(intoIter([1, 2, 5, 3]).takeWhile((n) => n < 4))).toEqual([1, 2]);
      expect(read(intoIter("abcde").takeWhile((char) => char < "d"))).toEqual(["a", "b", "c"]);
    });

    it("yields nothing when the first element fails", () => {
      expect(read(intoIter([5, 1, 2]).takeWhile((n) => n < 4))).toEqual([]);
    });

    it("yields the whole source when every element matches", () => {
      expect(read(intoIter([1, 2, 3]).takeWhile(() => true))).toEqual([1, 2, 3]);
    });

    it("yields nothing for an empty source and does not call the predicate", () => {
      const calls: number[] = [];

      expect(
        read(
          intoIter<number>([]).takeWhile((n) => {
            calls.push(n);
            return n > 0;
          }),
        ),
      ).toEqual([]);
      expect(calls).toHaveLength(0);
    });

    it("keeps falsy values that match", () => {
      expect(read(intoIter([0, 1, 2]).takeWhile((n) => n < 2))).toEqual([0, 1]);
      expect(read(intoIter([false, "", "stop", true]).takeWhile((value) => value !== "stop"))).toEqual([false, ""]);
    });

    it("does not yield elements after the first failure", () => {
      expect(read(intoIter([1, 5, 2, 3]).takeWhile((n) => n < 4))).toEqual([1]);
    });
  });

  describe("cursor", () => {
    it("stays done after the predicate fails", () => {
      const cursor = intoIter([1, 2, 5, 3])
        .takeWhile((n) => n < 4)
        [Symbol.iterator]();

      expect(cursor.next()).toEqual({ done: false, value: 1 });
      expect(cursor.next()).toEqual({ done: false, value: 2 });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
    });

    it("stays done when the first element fails", () => {
      const cursor = intoIter([5, 1, 2])
        .takeWhile((n) => n < 4)
        [Symbol.iterator]();

      expect(cursor.next()).toEqual({ done: true, value: undefined });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
    });

    it("stays done after a source that matched entirely", () => {
      const calls: number[] = [];
      const cursor = intoIter([1, 2])
        .takeWhile((n) => {
          calls.push(n);
          return true;
        })
        [Symbol.iterator]();

      expect(cursor.next()).toEqual({ done: false, value: 1 });
      expect(cursor.next()).toEqual({ done: false, value: 2 });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
      expect(calls).toHaveLength(2);
      expect(calls).toEqual([1, 2]);
    });

    it("has no backward step and no known length", () => {
      const cursor = intoIter([1, 2, 3])
        .takeWhile(() => true)
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
        .takeWhile((n) => n < 4);

      expect(calls).toEqual([]);
      expect(read(values)).toEqual([1, 2]);
    });

    it("does not read past the first failing element", () => {
      let pulls = 0;
      function* values() {
        for (const n of [1, 2, 5, 3, 4]) {
          pulls += 1;
          yield n;
        }
      }

      const cursor = intoIter(values())
        .takeWhile((n) => n < 4)
        [Symbol.iterator]();
      expect(read(cursor)).toEqual([1, 2]);
      cursor.next();

      expect(pulls).toBe(3);
    });
  });

  describe("reversed", () => {
    it("takes from the back when reversed comes first", () => {
      expect(read(intoIter([1, 2, 5, 3]).reversed.takeWhile((n) => n < 4))).toEqual([3]);
      expect(read(intoIter([1, 2, 3]).reversed.takeWhile((n) => n > 1))).toEqual([3, 2]);
    });

    it("throws when reversed comes after takeWhile", () => {
      const values = intoIter([1, 2, 3]).takeWhile((n) => n < 3).reversed;

      expect(() => read(values)).toThrow("Cannot walk backwards");
    });
  });

  describe("replay", () => {
    it("leaves the source readable", () => {
      const source = intoIter([1, 2, 5, 3]);

      expect(read(source.takeWhile((n) => n < 4))).toEqual([1, 2]);
      expect(read(source.takeWhile((n) => n < 4))).toEqual([1, 2]);
      expect(read(source)).toEqual([1, 2, 5, 3]);
    });
  });

  describe("types", () => {
    it("checks the predicate against the element type", () => {
      const numbers = intoIter([1, 2, 3]);

      // @ts-expect-error predicate receives numbers
      numbers.takeWhile((s: string) => s.length > 0);
    });
  });
});
