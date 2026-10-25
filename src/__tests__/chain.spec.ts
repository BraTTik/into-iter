import { describe, it, expect } from "@jest/globals";
import "../chain.js";
import "../map.js";
import { intoIter } from "../into-iter-factory.js";

const read = <T>(iter: Iterable<T>): T[] => [...iter];

describe("IntoIter chain", () => {
  describe("forward", () => {
    it("yields the first sequence and then the second", () => {
      expect(read(intoIter([1, 2]).chain([3, 4]))).toEqual([1, 2, 3, 4]);
      expect(read(intoIter("ab").chain("cd"))).toEqual(["a", "b", "c", "d"]);
      expect(read(intoIter(2).chain([10, 11]))).toEqual([0, 1, 10, 11]);
    });

    it("skips an empty side", () => {
      expect(read(intoIter<number>([]).chain([1, 2]))).toEqual([1, 2]);
      expect(read(intoIter([1, 2]).chain([]))).toEqual([1, 2]);
      expect(read(intoIter<number>([]).chain([]))).toEqual([]);
    });

    it("keeps several chains in order", () => {
      expect(read(intoIter([1]).chain([2]).chain([3, 4]))).toEqual([1, 2, 3, 4]);
    });

    it("accepts another IntoIter and leaves it readable", () => {
      const other = intoIter([3, 4]);

      expect(read(intoIter([1, 2]).chain(other))).toEqual([1, 2, 3, 4]);
      expect(read(other)).toEqual([3, 4]);
    });
  });

  describe("laziness", () => {
    it("does not open either side until iteration starts", () => {
      const opened = { first: 0, second: 0 };
      const side = (name: "first" | "second", values: number[]) => ({
        *[Symbol.iterator]() {
          opened[name] += 1;
          yield* values;
        },
      });
      const chained = intoIter(side("first", [1, 2])).chain(side("second", [3, 4]));

      expect(opened).toEqual({ first: 0, second: 0 });
      expect(read(chained)).toEqual([1, 2, 3, 4]);
      expect(opened).toEqual({ first: 1, second: 1 });
    });

    it("does not open the second side until the first is exhausted", () => {
      let opened = 0;
      const other = {
        *[Symbol.iterator]() {
          opened += 1;
          yield 3;
          yield 4;
        },
      };
      const cursor = intoIter([1, 2]).chain(other)[Symbol.iterator]();

      expect(cursor.next()).toEqual({ done: false, value: 1 });
      expect(cursor.next()).toEqual({ done: false, value: 2 });
      expect(opened).toBe(0);
      expect(cursor.next()).toEqual({ done: false, value: 3 });
      expect(opened).toBe(1);
    });

    it("does not read the first side while walking the second from the back", () => {
      const calls: number[] = [];
      const cursor = intoIter([1, 2])
        .map((n) => {
          calls.push(n);
          return n;
        })
        .chain([3, 4])
        [Symbol.iterator]();

      expect(cursor.nextBack?.()).toEqual({ done: false, value: 4 });
      expect(cursor.nextBack?.()).toEqual({ done: false, value: 3 });
      expect(calls).toEqual([]);
      expect(cursor.nextBack?.()).toEqual({ done: false, value: 2 });
      expect(calls).toEqual([2]);
    });
  });

  describe("replay", () => {
    it("reads an array chain again from the start", () => {
      const source = intoIter([1, 2]);
      const chained = source.chain([3, 4]);

      expect(read(chained)).toEqual([1, 2, 3, 4]);
      expect(read(chained)).toEqual([1, 2, 3, 4]);
      expect(read(source)).toEqual([1, 2]);
    });

    it("reads a generator only once", () => {
      function* values() {
        yield 3;
        yield 4;
      }
      const chained = intoIter([1, 2]).chain(values());

      expect(read(chained)).toEqual([1, 2, 3, 4]);
      expect(read(chained)).toEqual([1, 2]);
    });
  });

  describe("both ends", () => {
    it("walks the second sequence from the back and then the first", () => {
      const cursor = intoIter([1, 2]).chain([3, 4])[Symbol.iterator]();

      expect(cursor.nextBack?.()).toEqual({ done: false, value: 4 });
      expect(cursor.nextBack?.()).toEqual({ done: false, value: 3 });
      expect(cursor.nextBack?.()).toEqual({ done: false, value: 2 });
      expect(cursor.nextBack?.()).toEqual({ done: false, value: 1 });
      expect(cursor.nextBack?.()).toEqual({ done: true, value: undefined });
    });

    it("meets in the middle without yielding an element twice", () => {
      const cursor = intoIter([1, 2, 3]).chain([4])[Symbol.iterator]();

      expect(cursor.next()).toEqual({ done: false, value: 1 });
      expect(cursor.nextBack?.()).toEqual({ done: false, value: 4 });
      expect(cursor.nextBack?.()).toEqual({ done: false, value: 3 });
      expect(cursor.next()).toEqual({ done: false, value: 2 });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
      expect(cursor.nextBack?.()).toEqual({ done: true, value: undefined });
    });

    it("stays done after exhaustion", () => {
      const cursor = intoIter([1]).chain([2])[Symbol.iterator]();

      expect(cursor.next()).toEqual({ done: false, value: 1 });
      expect(cursor.next()).toEqual({ done: false, value: 2 });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
      expect(cursor.nextBack?.()).toEqual({ done: true, value: undefined });
    });

    it("reverses a chain of double-ended sequences from the last one", () => {
      expect(read(intoIter([1, 2]).chain([3, 4]).reversed)).toEqual([4, 3, 2, 1]);
      expect(read(intoIter([1]).chain([2]).chain([3]).reversed)).toEqual([3, 2, 1]);
    });
  });

  describe("length", () => {
    it("sums the lengths when both sides know them", () => {
      const cursor = intoIter([1, 2]).chain([3, 4])[Symbol.iterator]();

      expect(cursor.remaining?.()).toBe(4);
      expect(cursor.next()).toEqual({ done: false, value: 1 });
      expect(cursor.remaining?.()).toBe(3);
      expect(cursor.nextBack?.()).toEqual({ done: false, value: 4 });
      expect(cursor.remaining?.()).toBe(2);
      expect(intoIter<number>([]).chain([])[Symbol.iterator]().remaining?.()).toBe(0);
    });

    it("has no length when either side does not know it", () => {
      expect(
        intoIter(new Set([1, 2]))
          .chain([3])
          [Symbol.iterator]().remaining,
      ).toBeUndefined();
      expect(
        intoIter([1, 2])
          .chain(new Set([3]))
          [Symbol.iterator]().remaining,
      ).toBeUndefined();
    });
  });

  describe("forward only", () => {
    it("still yields a Set and then has no backward step", () => {
      const cursor = intoIter([1, 2])
        .chain(new Set([3, 4]))
        [Symbol.iterator]();

      expect(read(cursor)).toEqual([1, 2, 3, 4]);
      expect(
        intoIter([1, 2])
          .chain(new Set([3, 4]))
          [Symbol.iterator]().nextBack,
      ).toBeUndefined();
    });

    it("throws when a forward-only chain is reversed", () => {
      const values = intoIter(new Set([1, 2])).chain([3, 4]).reversed;

      expect(() => read(values)).toThrow("Cannot walk backwards");
    });
  });

  describe("types", () => {
    it("requires the same element type", () => {
      const words = intoIter(["a", "b"]);

      // @ts-expect-error chain expects strings
      words.chain([1, 2]);
    });
  });
});
