import { describe, it, expect } from "@jest/globals";
import "../filter.js";
import "../flat-map.js";
import "../limit.js";
import "../map.js";
import "../skip.js";
import { intoIter } from "../into-iter-factory.js";

const collect = <T>(iter: Iterable<T>): T[] => [...iter];

describe("IntoIter flatMap", () => {
  describe("forward", () => {
    it("flattens rows of an array", () => {
      expect(
        collect(
          intoIter([
            [1, 2],
            [3, 4],
          ]).flatMap((row) => row),
        ),
      ).toEqual([1, 2, 3, 4]);
    });

    it("flattens one level", () => {
      expect(collect(intoIter([[[1, 2]], [[3]]]).flatMap((row) => row))).toEqual([[1, 2], [3]]);
    });

    it("expands each element into several values", () => {
      expect(collect(intoIter([1, 2, 3]).flatMap((n) => [n, n * 10]))).toEqual([1, 10, 2, 20, 3, 30]);
    });

    it("flattens characters of a returned string", () => {
      expect(collect(intoIter([1]).flatMap(() => "ab"))).toEqual(["a", "b"]);
    });

    it("keeps a string whole when it is wrapped in an array", () => {
      expect(collect(intoIter([1, 2]).flatMap((n) => [String(n)]))).toEqual(["1", "2"]);
    });

    it("splits lines into words", () => {
      expect(collect(intoIter(["foo bar", "baz"]).flatMap((line) => line.split(" ")))).toEqual(["foo", "bar", "baz"]);
    });

    it("flattens characters of a string source", () => {
      expect(collect(intoIter("ab").flatMap((char) => [char, char.toUpperCase()]))).toEqual(["a", "A", "b", "B"]);
    });

    it("flattens values returned as a Set", () => {
      expect(collect(intoIter([1, 2]).flatMap((n) => new Set([n, n * 10])))).toEqual([1, 10, 2, 20]);
    });

    it("flattens entries returned as a Map", () => {
      expect(collect(intoIter(["a", "b"]).flatMap((key) => new Map([[key, key.length]])))).toEqual([
        ["a", 1],
        ["b", 1],
      ]);
    });

    it("flattens a Set source", () => {
      expect(collect(intoIter(new Set([1, 2])).flatMap((n) => [n, n * 10]))).toEqual([1, 10, 2, 20]);
    });

    it("receives Map entries", () => {
      expect(
        collect(
          intoIter(
            new Map([
              ["a", 1],
              ["b", 2],
            ]),
          ).flatMap(([key, value]) => [[key, value * 10]]),
        ),
      ).toEqual([
        ["a", 10],
        ["b", 20],
      ]);
    });

    it("flattens another IntoIter", () => {
      expect(collect(intoIter([1, 2]).flatMap((n) => intoIter([n, n + 1])))).toEqual([1, 2, 2, 3]);
    });

    it("flattens a generator", () => {
      function* pair(n: number) {
        yield n;
        yield n * 10;
      }

      expect(collect(intoIter([1, 2]).flatMap((n) => pair(n)))).toEqual([1, 10, 2, 20]);
    });

    it("skips empty inner sequences", () => {
      expect(collect(intoIter([1, 2, 3]).flatMap((n) => (n === 2 ? [n] : [])))).toEqual([2]);
    });

    it("skips several empty sequences in a row", () => {
      expect(collect(intoIter([1, 2, 3]).flatMap((n) => (n === 3 ? [n] : [])))).toEqual([3]);
    });

    it("skips an empty sequence between values", () => {
      expect(collect(intoIter([[1], [], [2, 3]]).flatMap((row) => row))).toEqual([1, 2, 3]);
    });

    it("yields nothing when every inner sequence is empty", () => {
      expect(collect(intoIter([1, 2, 3]).flatMap(() => []))).toEqual([]);
    });

    it("yields nothing for an empty source", () => {
      expect(collect(intoIter<number[]>([]).flatMap((row) => row))).toEqual([]);
    });

    it("throws TypeError when the callback result is not iterable", () => {
      expect(() => collect(intoIter([1]).flatMap(() => 1 as unknown as Iterable<number>))).toThrow(TypeError);
    });

    it("stays done after exhaustion", () => {
      const cursor = intoIter([[1]])
        .flatMap((row) => row)
        [Symbol.iterator]();

      cursor.next();

      expect(cursor.next()).toEqual({ done: true, value: undefined });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
    });
  });

  describe("laziness", () => {
    it("does not call the callback until iteration starts", () => {
      const calls: number[] = [];

      intoIter([1, 2, 3]).flatMap((n) => {
        calls.push(n);
        return [n];
      });

      expect(calls).toEqual([]);
    });

    it("does not open rows past the consumed elements", () => {
      const calls: number[][] = [];
      const iter = intoIter([
        [1, 2],
        [3, 4],
        [5, 6],
      ])
        .flatMap((row) => {
          calls.push(row);
          return row;
        })
        .limit(2);

      expect(collect(iter)).toEqual([1, 2]);
      expect(calls).toEqual([[1, 2]]);
    });

    it("opens the next row only to satisfy the limit", () => {
      const calls: number[][] = [];

      expect(
        collect(
          intoIter([
            [1, 2],
            [3, 4],
            [5, 6],
          ])
            .flatMap((row) => {
              calls.push(row);
              return row;
            })
            .limit(3),
        ),
      ).toEqual([1, 2, 3]);
      expect(calls).toEqual([
        [1, 2],
        [3, 4],
      ]);
    });

    it("stops an infinite inner sequence", () => {
      let yielded = 0;
      function* naturals() {
        for (let n = 0; ; n++) {
          yielded++;
          yield n;
        }
      }

      expect(
        collect(
          intoIter([0])
            .flatMap(() => naturals())
            .limit(3),
        ),
      ).toEqual([0, 1, 2]);
      expect(yielded).toBe(3);
    });
  });

  describe("view semantics", () => {
    it("reads the flattened view again from the start", () => {
      const iter = intoIter([[1, 2], [3]]).flatMap((row) => row);

      expect(collect(iter)).toEqual([1, 2, 3]);
      expect(collect(iter)).toEqual([1, 2, 3]);
    });

    it("calls the callback again on the next read", () => {
      const calls: number[] = [];
      const iter = intoIter([1, 2]).flatMap((n) => {
        calls.push(n);
        return [n];
      });

      collect(iter);
      collect(iter);

      expect(calls).toEqual([1, 2, 1, 2]);
    });

    it("does not change the original iterator", () => {
      const source = intoIter([[1, 2], [3]]);

      expect(collect(source.flatMap((row) => row))).toEqual([1, 2, 3]);
      expect(collect(source)).toEqual([[1, 2], [3]]);
    });

    it("keeps two flattened views independent", () => {
      const source = intoIter([
        [1, 2],
        [3, 4],
      ]);
      const first = source.flatMap((row) => row)[Symbol.iterator]();
      const second = source.flatMap((row) => row.map((n) => n * 10))[Symbol.iterator]();

      expect(first.next().value).toBe(1);
      expect(second.next().value).toBe(10);
      expect(first.next().value).toBe(2);
    });
  });

  describe("remaining", () => {
    it("does not report a length", () => {
      expect(
        intoIter([[1], [2, 3, 4]])
          .flatMap((row) => row)
          [Symbol.iterator]().remaining,
      ).toBeUndefined();
    });
  });

  describe("with other adapters", () => {
    it("flattens after map", () => {
      expect(
        collect(
          intoIter([1, 2])
            .map((n) => [n, n * 10])
            .flatMap((row) => row),
        ),
      ).toEqual([1, 10, 2, 20]);
    });

    it("filters the flattened values", () => {
      expect(
        collect(
          intoIter([
            [1, 2],
            [3, 4],
          ])
            .flatMap((row) => row)
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
            .flatMap((row) => row)
            .skip(2),
        ),
      ).toEqual([3, 4]);
    });

    it("limits the flattened values", () => {
      expect(
        collect(
          intoIter([[1], [2, 3, 4]])
            .flatMap((row) => row)
            .limit(2),
        ),
      ).toEqual([1, 2]);
    });

    it("throws when the limited window is reversed because the length is unknown", () => {
      expect(() =>
        collect(
          intoIter([[1], [2, 3, 4]])
            .flatMap((row) => row)
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
          ]).flatMap((row) => row).reversed,
        ),
      ).toEqual([4, 3, 2, 1]);
    });

    it("walks a single row from the back", () => {
      expect(collect(intoIter([[1, 2, 3, 4]]).flatMap((row) => row).reversed)).toEqual([4, 3, 2, 1]);
    });

    it("walks characters of returned strings from the back", () => {
      expect(collect(intoIter(["ab", "cd"]).flatMap((word) => word).reversed)).toEqual(["d", "c", "b", "a"]);
    });

    it("skips empty rows at the back", () => {
      expect(collect(intoIter([[1, 2], [], [3]]).flatMap((row) => row).reversed)).toEqual([3, 2, 1]);
    });

    it("yields nothing for an empty source", () => {
      expect(collect(intoIter<number[]>([]).flatMap((row) => row).reversed)).toEqual([]);
    });

    it("takes the last flattened elements", () => {
      expect(
        collect(
          intoIter([[1], [2, 3, 4]])
            .flatMap((row) => row)
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
          ]).flatMap((row) => row).reversed.reversed,
        ),
      ).toEqual([1, 2, 3, 4]);
    });

    it("throws when an inner Set is read from the back", () => {
      expect(() => collect(intoIter([1, 2]).flatMap((n) => new Set([n, n * 10])).reversed)).toThrow(
        "Cannot walk backwards",
      );
    });

    it("throws when the outer source cannot be read from the back", () => {
      expect(() => collect(intoIter(new Set([1, 2])).flatMap((n) => [n]).reversed)).toThrow("Cannot walk backwards");
    });
  });

  describe("mixed next and nextBack", () => {
    it("reads separate rows from both ends", () => {
      const cursor = intoIter([
        [1, 2],
        [3, 4],
      ])
        .flatMap((row) => row)
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
        .flatMap((row) => row)
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
