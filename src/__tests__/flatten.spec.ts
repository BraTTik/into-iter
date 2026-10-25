import { describe, it, expect } from "@jest/globals";
import "../filter.js";
import "../flat-map.js";
import "../limit.js";
import "../skip.js";
import { intoIter } from "../into-iter-factory.js";

const collect = <T>(iter: Iterable<T>): T[] => [...iter];

describe("IntoIter flatten", () => {
  describe("one level", () => {
    it("flattens rows of an array", () => {
      expect(
        collect(
          intoIter([
            [1, 2],
            [3, 4],
          ]).flatten(),
        ),
      ).toEqual([1, 2, 3, 4]);
    });

    it("leaves the next level nested", () => {
      expect(collect(intoIter([[[1, 2]], [[3]]]).flatten())).toEqual([[1, 2], [3]]);
    });

    it("removes the next level with a second flatten", () => {
      expect(
        collect(
          intoIter([[[1, 2]], [[3]]])
            .flatten()
            .flatten(),
        ),
      ).toEqual([1, 2, 3]);
    });

    it("flattens characters of a string", () => {
      expect(collect(intoIter(["ab", "cd"]).flatten())).toEqual(["a", "b", "c", "d"]);
    });

    it("flattens values of a Set", () => {
      expect(collect(intoIter([new Set([1, 2]), new Set([3])]).flatten())).toEqual([1, 2, 3]);
    });

    it("flattens entries of a Map", () => {
      expect(collect(intoIter([new Map([["a", 1]]), new Map([["b", 2]])]).flatten())).toEqual([
        ["a", 1],
        ["b", 2],
      ]);
    });

    it("flattens another IntoIter", () => {
      expect(collect(intoIter([intoIter([1, 2]), intoIter([3])]).flatten())).toEqual([1, 2, 3]);
    });

    it("flattens a generator", () => {
      function* pair(n: number) {
        yield n;
        yield n * 10;
      }

      expect(collect(intoIter([pair(1), pair(2)]).flatten())).toEqual([1, 10, 2, 20]);
    });

    it("skips empty inner sequences", () => {
      expect(collect(intoIter([[1], [], [2, 3]]).flatten())).toEqual([1, 2, 3]);
    });

    it("skips several empty sequences in a row", () => {
      expect(collect(intoIter([[], [], [1]]).flatten())).toEqual([1]);
    });

    it("yields nothing when every inner sequence is empty", () => {
      expect(collect(intoIter([[], []]).flatten())).toEqual([]);
    });

    it("yields nothing for an empty source", () => {
      expect(collect(intoIter<number[]>([]).flatten())).toEqual([]);
    });

    it("throws TypeError when an element is not iterable", () => {
      const source = [1, [2]] as unknown as Iterable<number>[];

      expect(() => collect(intoIter(source).flatten())).toThrow(TypeError);
    });

    it("stays done after exhaustion", () => {
      const cursor = intoIter([[1]])
        .flatten()
        [Symbol.iterator]();

      cursor.next();

      expect(cursor.next()).toEqual({ done: true, value: undefined });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
    });
  });

  describe("laziness", () => {
    it("does not open inner sequences until iteration starts", () => {
      let opened = 0;
      const rows = [
        {
          *[Symbol.iterator]() {
            opened++;
            yield 1;
            yield 2;
          },
        },
      ];
      const iter = intoIter(rows).flatten();

      expect(opened).toBe(0);
      expect(collect(iter)).toEqual([1, 2]);
      expect(opened).toBe(1);
    });

    it("does not open rows past the consumed elements", () => {
      let opened = 0;
      const row = (values: number[]) => ({
        *[Symbol.iterator]() {
          opened++;
          yield* values;
        },
      });

      expect(
        collect(
          intoIter([row([1, 2]), row([3, 4]), row([5, 6])])
            .flatten()
            .limit(2),
        ),
      ).toEqual([1, 2]);
      expect(opened).toBe(1);
    });
  });

  describe("view semantics", () => {
    it("reads the flattened view again from the start", () => {
      const iter = intoIter([[1, 2], [3]]).flatten();

      expect(collect(iter)).toEqual([1, 2, 3]);
      expect(collect(iter)).toEqual([1, 2, 3]);
    });

    it("opens inner sequences again on the next read", () => {
      let opened = 0;
      const rows = [
        {
          *[Symbol.iterator]() {
            opened++;
            yield 1;
          },
        },
      ];
      const iter = intoIter(rows).flatten();

      collect(iter);
      collect(iter);

      expect(opened).toBe(2);
    });

    it("does not change the original iterator", () => {
      const source = intoIter([[1, 2], [3]]);

      expect(collect(source.flatten())).toEqual([1, 2, 3]);
      expect(collect(source)).toEqual([[1, 2], [3]]);
    });
  });

  describe("remaining", () => {
    it("does not report a length", () => {
      expect(
        intoIter([[1], [2, 3, 4]])
          .flatten()
          [Symbol.iterator]().remaining,
      ).toBeUndefined();
    });
  });

  describe("with other adapters", () => {
    it("filters the flattened values", () => {
      expect(
        collect(
          intoIter([
            [1, 2],
            [3, 4],
          ])
            .flatten()
            .filter((n) => n % 2 === 0),
        ),
      ).toEqual([2, 4]);
    });

    it("skips flattened values", () => {
      expect(
        collect(
          intoIter([
            [1, 2],
            [3, 4],
          ])
            .flatten()
            .skip(2),
        ),
      ).toEqual([3, 4]);
    });

    it("limits the flattened values", () => {
      expect(
        collect(
          intoIter([[1], [2, 3, 4]])
            .flatten()
            .limit(2),
        ),
      ).toEqual([1, 2]);
    });

    it("throws when the limited window is reversed because the length is unknown", () => {
      expect(() =>
        collect(
          intoIter([[1], [2, 3, 4]])
            .flatten()
            .limit(2).reversed,
        ),
      ).toThrow("Cannot walk backwards");
    });
  });

  describe("reversed", () => {
    it("walks rows and their elements from the back", () => {
      expect(
        collect(
          intoIter([
            [1, 2],
            [3, 4],
          ]).flatten().reversed,
        ),
      ).toEqual([4, 3, 2, 1]);
    });

    it("walks a single row from the back", () => {
      expect(collect(intoIter([[1, 2, 3, 4]]).flatten().reversed)).toEqual([4, 3, 2, 1]);
    });

    it("walks characters from the back", () => {
      expect(collect(intoIter(["ab", "cd"]).flatten().reversed)).toEqual(["d", "c", "b", "a"]);
    });

    it("skips empty rows at the back", () => {
      expect(collect(intoIter([[1, 2], [], [3]]).flatten().reversed)).toEqual([3, 2, 1]);
    });

    it("takes the last flattened elements", () => {
      expect(
        collect(
          intoIter([[1], [2, 3, 4]])
            .flatten()
            .reversed.limit(2),
        ),
      ).toEqual([4, 3]);
    });

    it("restores the original order when reversed twice", () => {
      expect(
        collect(
          intoIter([
            [1, 2],
            [3, 4],
          ]).flatten().reversed.reversed,
        ),
      ).toEqual([1, 2, 3, 4]);
    });

    it("throws when an inner Set is read from the back", () => {
      expect(() => collect(intoIter([new Set([1, 2]), new Set([3])]).flatten().reversed)).toThrow(
        "Cannot walk backwards",
      );
    });

    it("throws when the outer source cannot be read from the back", () => {
      expect(() => collect(intoIter(new Set([[1], [2]])).flatten().reversed)).toThrow("Cannot walk backwards");
    });
  });

  describe("mixed next and nextBack", () => {
    it("reads separate rows from both ends", () => {
      const cursor = intoIter([
        [1, 2],
        [3, 4],
      ])
        .flatten()
        [Symbol.iterator]();

      expect(cursor.next().value).toBe(1);
      expect(cursor.nextBack?.().value).toBe(4);
      expect(cursor.next().value).toBe(2);
      expect(cursor.nextBack?.().value).toBe(3);
      expect(cursor.next().done).toBe(true);
      expect(cursor.nextBack?.().done).toBe(true);
    });

    it("meets inside a single row", () => {
      const cursor = intoIter([[1, 2, 3, 4]])
        .flatten()
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
