import { describe, it, expect } from "@jest/globals";
import "../filter.js";
import "../map.js";
import { intoIter } from "../into-iter-factory.js";

const collect = <T>(iter: Iterable<T>): T[] => [...iter];

describe("IntoIter", () => {
  describe("map", () => {
    it("does not call the mapper until iteration starts", () => {
      const calls: number[] = [];

      intoIter(5).map((n) => {
        calls.push(n);
        return n;
      });

      expect(calls).toEqual([]);
    });

    it("calls the mapper only for consumed elements", () => {
      const calls: number[] = [];
      const iter = intoIter([1, 2, 3, 4]).map((n) => {
        calls.push(n);
        return n * 10;
      });

      const cursor = iter[Symbol.iterator]();

      expect(cursor.next().value).toBe(10);
      expect(calls).toEqual([1]);
      expect(cursor.next().value).toBe(20);
      expect(calls).toEqual([1, 2]);
    });

    it("reads the same mapped range again from the start", () => {
      const iter = intoIter(4).map((n) => n + 2);

      expect(collect(iter)).toEqual([2, 3, 4, 5]);
      expect(collect(iter)).toEqual([2, 3, 4, 5]);
    });

    it("reads a mapped iterable again from the start", () => {
      const iter = intoIter([1, 2, 3]).map((n) => n * 2);

      expect(collect(iter)).toEqual([2, 4, 6]);
      expect(collect(iter)).toEqual([2, 4, 6]);
    });

    it("replays a chain of maps and calls each mapper again", () => {
      const calls: number[] = [];
      const iter = intoIter(3)
        .map((n) => {
          calls.push(n);
          return n + 2;
        })
        .map((n) => n + 2);

      expect(collect(iter)).toEqual([4, 5, 6]);
      expect(calls).toEqual([0, 1, 2]);
      expect(collect(iter)).toEqual([4, 5, 6]);
      expect(calls).toEqual([0, 1, 2, 0, 1, 2]);
    });

    it("keeps a second map independent after the first is consumed", () => {
      const source = intoIter(4);
      const first = source.map((n) => n + 2);

      expect(collect(first)).toEqual([2, 3, 4, 5]);

      const second = source.map((n) => n + 2);

      expect(collect(second)).toEqual([2, 3, 4, 5]);
      expect(collect(first)).toEqual([2, 3, 4, 5]);
    });
  });

  describe("iteration", () => {
    it("reads a range twice from the start", () => {
      const iter = intoIter(4);

      expect(collect(iter)).toEqual([0, 1, 2, 3]);
      expect(collect(iter)).toEqual([0, 1, 2, 3]);
    });
  });

  describe("filter", () => {
    it("does not call the predicate until iteration starts", () => {
      const calls: number[] = [];

      intoIter([1, 2, 3]).filter((n) => {
        calls.push(n);
        return true;
      });

      expect(calls).toEqual([]);
    });

    it("calls the predicate only until the requested element is found", () => {
      const calls: number[] = [];
      const iter = intoIter([1, 2, 3, 4]).filter((n) => {
        calls.push(n);
        return n % 2 === 0;
      });

      const cursor = iter[Symbol.iterator]();

      expect(cursor.next().value).toBe(2);
      expect(calls).toEqual([1, 2]);
      expect(cursor.next().value).toBe(4);
      expect(calls).toEqual([1, 2, 3, 4]);
    });

    it("reads the same filtered iterable again from the start", () => {
      const iter = intoIter([1, 2, 3, 4]).filter((n) => n % 2 === 0);

      expect(collect(iter)).toEqual([2, 4]);
      expect(collect(iter)).toEqual([2, 4]);
    });

    it("chains map and filter and replays both", () => {
      const calls: number[] = [];
      const iter = intoIter(5)
        .map((n) => {
          calls.push(n);
          return n + 1;
        })
        .filter((n) => n % 2 === 0);

      expect(collect(iter)).toEqual([2, 4]);
      expect(calls).toEqual([0, 1, 2, 3, 4]);
      expect(collect(iter)).toEqual([2, 4]);
      expect(calls).toEqual([0, 1, 2, 3, 4, 0, 1, 2, 3, 4]);
    });

    it("keeps a second filter independent after the first is consumed", () => {
      const source = intoIter([1, 2, 3]);
      const first = source.filter((n) => n > 1);

      expect(collect(first)).toEqual([2, 3]);

      const second = source.filter((n) => n < 3);

      expect(collect(second)).toEqual([1, 2]);
      expect(collect(first)).toEqual([2, 3]);
    });
  });
});
