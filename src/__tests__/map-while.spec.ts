import { describe, it, expect } from "@jest/globals";
import "../map-while.js";
import "../map.js";
import { intoIter } from "../into-iter-factory.js";

const read = <T>(iter: Iterable<T>, limit = 8): T[] => {
  const values: T[] = [];
  for (const value of iter) {
    values.push(value);
    if (values.length > limit) {
      throw new Error(`iterator did not finish, received ${JSON.stringify(values)}`);
    }
  }
  return values;
};

describe("IntoIter mapWhile", () => {
  describe("forward", () => {
    it("yields mapped values until the function returns undefined", () => {
      expect(
        read(
          intoIter(["1", "2", "x", "4"]).mapWhile((s) => {
            const n = Number(s);
            return Number.isNaN(n) ? undefined : n;
          }),
        ),
      ).toEqual([1, 2]);
    });

    it("stops on null as well as undefined", () => {
      expect(read(intoIter([1, 2, null, 4]).mapWhile((value) => value))).toEqual([1, 2]);
    });

    it("keeps falsy mapped values other than null and undefined", () => {
      expect(read(intoIter([1, 0, 2]).mapWhile((n) => (n === 2 ? undefined : n)))).toEqual([1, 0]);
      expect(read(intoIter([false, "", "x"]).mapWhile((value) => (value === "x" ? undefined : value)))).toEqual([
        false,
        "",
      ]);
    });

    it("yields nothing when the first call returns undefined", () => {
      const calls: number[] = [];

      expect(
        read(
          intoIter([1, 2, 3]).mapWhile((n) => {
            calls.push(n);
            return undefined;
          }),
        ),
      ).toEqual([]);
      expect(calls).toStrictEqual([1]);
    });

    it("maps every element when none of the results are nullish", () => {
      const calls: number[] = [];

      expect(
        read(
          intoIter([1, 2, 3]).mapWhile((n) => {
            calls.push(n);
            return n * 10;
          }),
        ),
      ).toEqual([10, 20, 30]);
      expect(calls).toStrictEqual([1, 2, 3]);
    });

    it("yields nothing for an empty source and does not call fn", () => {
      const calls: number[] = [];

      expect(
        read(
          intoIter<number>([]).mapWhile((n) => {
            calls.push(n);
            return n;
          }),
        ),
      ).toEqual([]);
      expect(calls).toHaveLength(0);
    });
  });

  describe("cursor", () => {
    it("stays done after a nullish result", () => {
      const calls: number[] = [];
      const cursor = intoIter([1, 2, 3, 4])
        .mapWhile((n) => {
          calls.push(n);
          return n < 3 ? n * 10 : undefined;
        })
        [Symbol.iterator]();

      expect(cursor.next()).toEqual({ done: false, value: 10 });
      expect(cursor.next()).toEqual({ done: false, value: 20 });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
      expect(calls).toStrictEqual([1, 2, 3]);
    });

    it("does not call fn after the source ends", () => {
      const calls: number[] = [];
      const cursor = intoIter([1, 2])
        .mapWhile((n) => {
          calls.push(n);
          return n * 10;
        })
        [Symbol.iterator]();

      expect(cursor.next()).toEqual({ done: false, value: 10 });
      expect(cursor.next()).toEqual({ done: false, value: 20 });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
      expect(calls).toStrictEqual([1, 2]);
    });

    it("has no backward step and no known length", () => {
      const cursor = intoIter([1, 2, 3])
        .mapWhile((n) => n)
        [Symbol.iterator]();

      expect(cursor.nextBack).toBeUndefined();
      expect(cursor.remaining).toBeUndefined();
    });
  });

  describe("laziness", () => {
    it("does not read the source until iteration starts", () => {
      const calls: number[] = [];
      const values = intoIter([1, 2, 3, 4])
        .map((n) => {
          calls.push(n);
          return n;
        })
        .mapWhile((n) => (n < 3 ? n * 10 : undefined));

      expect(calls).toEqual([]);
      expect(read(values)).toEqual([10, 20]);
    });

    it("does not read past the nullish result", () => {
      let pulls = 0;
      function* values() {
        for (const n of [1, 2, 3, 4]) {
          pulls += 1;
          yield n;
        }
      }

      const cursor = intoIter(values())
        .mapWhile((n) => (n < 3 ? n * 10 : undefined))
        [Symbol.iterator]();

      expect(read(cursor)).toEqual([10, 20]);
      cursor.next();

      expect(pulls).toBe(3);
    });
  });

  describe("reversed", () => {
    it("maps from the back when reversed comes first", () => {
      expect(read(intoIter([1, 2, 0, 4]).reversed.mapWhile((n) => (n === 0 ? undefined : n)))).toEqual([4]);
    });

    it("throws when reversed comes after mapWhile", () => {
      const values = intoIter([1, 2, 3]).mapWhile((n) => n).reversed;

      expect(() => read(values)).toThrow("Cannot walk backwards");
    });
  });

  describe("replay", () => {
    it("leaves the source readable", () => {
      const source = intoIter(["1", "2", "x", "4"]);
      const parse = (s: string) => {
        const n = Number(s);
        return Number.isNaN(n) ? undefined : n;
      };

      expect(read(source.mapWhile(parse))).toEqual([1, 2]);
      expect(read(source.mapWhile(parse))).toEqual([1, 2]);
      expect(read(source)).toEqual(["1", "2", "x", "4"]);
    });
  });

  describe("types", () => {
    it("checks fn against the element type", () => {
      const numbers = intoIter([1, 2, 3]);

      // @ts-expect-error fn receives numbers
      numbers.mapWhile((s: string) => s);
    });
  });
});
