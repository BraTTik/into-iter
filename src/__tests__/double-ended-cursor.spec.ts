import { describe, it, expect } from "@jest/globals";
import { arrayLikeDoubleEndedCursor, isArrayLike } from "../double-ended-cursor.js";
import type { DoubleEndedCursor } from "../double-ended-cursor.js";

const collect = <T>(iter: Iterable<T>): T[] => [...iter];

const collectBack = <T>(cursor: DoubleEndedCursor<T>): T[] => {
  const result: T[] = [];
  for (let item = cursor.nextBack(); !item.done; item = cursor.nextBack()) {
    result.push(item.value);
  }
  return result;
};

describe("arrayLikeDoubleEndedCursor", () => {
  describe("next", () => {
    it("yields elements from the front", () => {
      expect(collect(arrayLikeDoubleEndedCursor([1, 2, 3]))).toEqual([1, 2, 3]);
    });

    it("yields a single element", () => {
      expect(collect(arrayLikeDoubleEndedCursor([1]))).toEqual([1]);
    });

    it("yields nothing for an empty array", () => {
      expect(collect(arrayLikeDoubleEndedCursor([]))).toEqual([]);
    });

    it("stays done after exhaustion", () => {
      const cursor = arrayLikeDoubleEndedCursor([1]);

      cursor.next();

      expect(cursor.next()).toEqual({ done: true, value: undefined });
      expect(cursor.next()).toEqual({ done: true, value: undefined });
    });
  });

  describe("nextBack", () => {
    it("yields elements from the back", () => {
      expect(collectBack(arrayLikeDoubleEndedCursor([1, 2, 3]))).toEqual([3, 2, 1]);
    });

    it("yields a single element", () => {
      expect(collectBack(arrayLikeDoubleEndedCursor([1]))).toEqual([1]);
    });

    it("yields nothing for an empty array", () => {
      expect(arrayLikeDoubleEndedCursor([]).nextBack()).toEqual({ done: true, value: undefined });
    });

    it("stays done after exhaustion", () => {
      const cursor = arrayLikeDoubleEndedCursor([1]);

      cursor.nextBack();

      expect(cursor.nextBack()).toEqual({ done: true, value: undefined });
      expect(cursor.nextBack()).toEqual({ done: true, value: undefined });
    });
  });

  describe("mixed next and nextBack", () => {
    it("consumes from both ends without overlap", () => {
      const cursor = arrayLikeDoubleEndedCursor([1, 2, 3, 4, 5]);

      expect(cursor.next().value).toBe(1);
      expect(cursor.nextBack().value).toBe(5);
      expect(cursor.next().value).toBe(2);
      expect(cursor.nextBack().value).toBe(4);
      expect(cursor.next().value).toBe(3);
      expect(cursor.next().done).toBe(true);
      expect(cursor.nextBack().done).toBe(true);
    });

    it("meets in the middle of an even-length array", () => {
      const cursor = arrayLikeDoubleEndedCursor([1, 2, 3, 4]);

      expect(cursor.next().value).toBe(1);
      expect(cursor.nextBack().value).toBe(4);
      expect(cursor.nextBack().value).toBe(3);
      expect(cursor.next().value).toBe(2);
      expect(cursor.next().done).toBe(true);
      expect(cursor.nextBack().done).toBe(true);
    });

    it("iterates the remaining middle after taking from the back", () => {
      const cursor = arrayLikeDoubleEndedCursor([1, 2, 3, 4]);

      cursor.nextBack();

      expect(collect(cursor)).toEqual([1, 2, 3]);
    });
  });

  describe("iterable protocol", () => {
    it("returns itself from Symbol.iterator", () => {
      const cursor = arrayLikeDoubleEndedCursor([1, 2]);

      expect(cursor[Symbol.iterator]()).toBe(cursor);
    });

    it("is single-pass", () => {
      const cursor = arrayLikeDoubleEndedCursor([1, 2]);

      expect(collect(cursor)).toEqual([1, 2]);
      expect(collect(cursor)).toEqual([]);
    });
  });

  describe("array-like sources", () => {
    it("iterates a string by code units in both directions", () => {
      expect(collect(arrayLikeDoubleEndedCursor("abc"))).toEqual(["a", "b", "c"]);
      expect(collectBack(arrayLikeDoubleEndedCursor("abc"))).toEqual(["c", "b", "a"]);
    });

    it("iterates a typed array in both directions", () => {
      expect(collect(arrayLikeDoubleEndedCursor(new Uint8Array([1, 2, 3])))).toEqual([1, 2, 3]);
      expect(collectBack(arrayLikeDoubleEndedCursor(new Uint8Array([1, 2, 3])))).toEqual([3, 2, 1]);
    });

    it("does not copy the source", () => {
      const source = [1, 2, 3];
      const cursor = arrayLikeDoubleEndedCursor(source);

      source[2] = 30;

      expect(cursor.nextBack().value).toBe(30);
    });
  });
});

describe("isArrayLike", () => {
  it("accepts arrays", () => {
    expect(isArrayLike([])).toBe(true);
    expect(isArrayLike([1, 2, 3])).toBe(true);
  });

  it("accepts strings", () => {
    expect(isArrayLike("")).toBe(true);
    expect(isArrayLike("abc")).toBe(true);
  });

  it("accepts typed arrays", () => {
    expect(isArrayLike(new Uint8Array(2))).toBe(true);
  });

  it("rejects iterables without length", () => {
    expect(isArrayLike(new Set([1, 2]))).toBe(false);
    expect(isArrayLike(new Map())).toBe(false);
  });

  it("rejects objects with length but without Symbol.iterator", () => {
    expect(isArrayLike({ length: 2, 0: "a", 1: "b" })).toBe(false);
  });

  it("rejects primitives and nullish values", () => {
    expect(isArrayLike(null)).toBe(false);
    expect(isArrayLike(undefined)).toBe(false);
    expect(isArrayLike(42)).toBe(false);
  });
});
