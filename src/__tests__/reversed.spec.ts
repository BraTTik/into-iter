import { describe, it, expect } from "@jest/globals";
import "../filter.js";
import "../map.js";
import { intoIter } from "../into-iter-factory.js";

const collect = <T>(iter: Iterable<T>): T[] => [...iter];

describe("IntoIter reversed", () => {
  describe("sources", () => {
    it("walks an array from the back", () => {
      expect(collect(intoIter([1, 2, 3]).reversed)).toEqual([3, 2, 1]);
    });

    it("walks a range from the back", () => {
      expect(collect(intoIter(5).reversed)).toEqual([4, 3, 2, 1, 0]);
    });

    it("walks a range with a custom step from the last reachable value", () => {
      expect(collect(intoIter({ start: 2, end: 9, step: 3 }).reversed)).toEqual([8, 5, 2]);
    });

    it("walks a string from the back", () => {
      expect(collect(intoIter("abc").reversed)).toEqual(["c", "b", "a"]);
    });

    it("yields nothing for empty sources", () => {
      expect(collect(intoIter([]).reversed)).toEqual([]);
      expect(collect(intoIter(0).reversed)).toEqual([]);
    });

    it("yields the last element of a large range without walking it", () => {
      const calls: number[] = [];
      const cursor = intoIter(1_000_000)
        .map((n) => {
          calls.push(n);
          return n;
        })
        .reversed[Symbol.iterator]();

      expect(cursor.next()).toEqual({ done: false, value: 999_999 });
      expect(calls).toEqual([999_999]);
    });
  });

  describe("view semantics", () => {
    it("does not change the original iterator", () => {
      const source = intoIter([1, 2, 3]);
      const reversed = source.reversed;

      expect(collect(reversed)).toEqual([3, 2, 1]);
      expect(collect(source)).toEqual([1, 2, 3]);
    });

    it("reads the reversed view again from the start", () => {
      const iter = intoIter([1, 2, 3]).reversed;

      expect(collect(iter)).toEqual([3, 2, 1]);
      expect(collect(iter)).toEqual([3, 2, 1]);
    });

    it("restores the original order when applied twice", () => {
      expect(collect(intoIter([1, 2, 3]).reversed.reversed)).toEqual([1, 2, 3]);
    });

    it("reverses again when applied three times", () => {
      expect(collect(intoIter("abc").reversed.reversed.reversed)).toEqual(["c", "b", "a"]);
    });

    it("keeps two reversed views independent", () => {
      const source = intoIter([1, 2, 3]);
      const first = source.reversed[Symbol.iterator]();
      const second = source.reversed[Symbol.iterator]();

      expect(first.next().value).toBe(3);
      expect(first.next().value).toBe(2);
      expect(second.next().value).toBe(3);
    });
  });

  describe("cursor", () => {
    it("walks forward through nextBack", () => {
      const cursor = intoIter([1, 2, 3]).reversed[Symbol.iterator]();

      expect(cursor.nextBack?.()).toEqual({ done: false, value: 1 });
      expect(cursor.nextBack?.()).toEqual({ done: false, value: 2 });
    });

    it("consumes from both ends without overlap", () => {
      const cursor = intoIter([1, 2, 3, 4]).reversed[Symbol.iterator]();

      expect(cursor.next().value).toBe(4);
      expect(cursor.nextBack?.().value).toBe(1);
      expect(cursor.next().value).toBe(3);
      expect(cursor.nextBack?.().value).toBe(2);
      expect(cursor.next().done).toBe(true);
      expect(cursor.nextBack?.().done).toBe(true);
    });

    it("stays done after exhaustion", () => {
      const cursor = intoIter([1]).reversed[Symbol.iterator]();

      cursor.next();

      expect(cursor.next()).toEqual({ done: true, value: undefined });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
    });

    it("returns itself from Symbol.iterator", () => {
      const cursor = intoIter([1, 2]).reversed[Symbol.iterator]();

      expect(cursor[Symbol.iterator]()).toBe(cursor);
    });
  });

  describe("with adapters", () => {
    it("maps after reversing", () => {
      expect(collect(intoIter([1, 2, 3]).reversed.map((n) => n * 10))).toEqual([30, 20, 10]);
    });

    it("reverses after mapping", () => {
      expect(collect(intoIter([1, 2, 3]).map((n) => n * 10).reversed)).toEqual([30, 20, 10]);
    });

    it("calls the mapper lazily in reversed order", () => {
      const calls: number[] = [];
      const cursor = intoIter([1, 2, 3])
        .map((n) => {
          calls.push(n);
          return n;
        })
        .reversed[Symbol.iterator]();

      expect(calls).toEqual([]);
      cursor.next();
      expect(calls).toEqual([3]);
      cursor.next();
      expect(calls).toEqual([3, 2]);
    });

    it("filters after reversing", () => {
      expect(collect(intoIter(10).reversed.filter((n) => n % 3 === 0))).toEqual([9, 6, 3, 0]);
    });

    it("reverses after filtering", () => {
      expect(collect(intoIter(10).filter((n) => n % 3 === 0).reversed)).toEqual([9, 6, 3, 0]);
    });

    it("calls the predicate only until the last matching element is found", () => {
      const calls: number[] = [];
      const cursor = intoIter([1, 2, 3, 4, 5])
        .filter((n) => {
          calls.push(n);
          return n % 2 === 0;
        })
        .reversed[Symbol.iterator]();

      expect(cursor.next().value).toBe(4);
      expect(calls).toEqual([5, 4]);
    });

    it("keeps reversing through a chain of adapters", () => {
      const iter = intoIter(10)
        .map((n) => n + 2)
        .filter((n) => n % 2 === 0)
        .reversed.map((n) => n + 2).reversed;

      expect(collect(iter)).toEqual([4, 6, 8, 10, 12]);
    });

    it("replays a reversed chain and calls the mapper again", () => {
      const calls: number[] = [];
      const iter = intoIter(3).map((n) => {
        calls.push(n);
        return n;
      }).reversed;

      expect(collect(iter)).toEqual([2, 1, 0]);
      expect(collect(iter)).toEqual([2, 1, 0]);
      expect(calls).toEqual([2, 1, 0, 2, 1, 0]);
    });
  });

  describe("single-direction sources", () => {
    it("throws on iteration of a reversed Set", () => {
      const iter = intoIter(new Set([1, 2, 3])).reversed;

      expect(() => collect(iter)).toThrow("Cannot walk backwards");
    });

    it("throws on iteration of a reversed generator", () => {
      function* numbers() {
        yield 1;
        yield 2;
      }

      expect(() => collect(intoIter(numbers()).reversed)).toThrow("Cannot walk backwards");
    });

    it("throws through adapters over a single-direction source", () => {
      const iter = intoIter(new Set([1, 2, 3])).map((n) => n * 2).reversed;

      expect(() => collect(iter)).toThrow("Cannot walk backwards");
    });

    it("does not open the source when the getter is called", () => {
      let opened = 0;
      const source: Iterable<number> = {
        [Symbol.iterator]() {
          opened++;
          return new Set([1, 2])[Symbol.iterator]();
        },
      };

      const iter = intoIter(source).reversed;

      expect(opened).toBe(0);
      expect(() => collect(iter)).toThrow("Cannot walk backwards");
      expect(opened).toBe(1);
    });

    it("still iterates forward after reversing twice", () => {
      expect(collect(intoIter(new Set([1, 2, 3])).reversed.reversed)).toEqual([1, 2, 3]);
    });
  });
});
