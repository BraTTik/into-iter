import { describe, it, expect } from "@jest/globals";
import { rangeIterator, isRangeOptions } from "../range-iterator.js";
import type { DoubleEndedCursor } from "../double-ended-cursor.js";

const collect = (iter: Iterable<number>): number[] => [...iter];

const collectBack = (cursor: DoubleEndedCursor<number>): number[] => {
  const result: number[] = [];
  for (let item = cursor.nextBack(); !item.done; item = cursor.nextBack()) {
    result.push(item.value);
  }
  return result;
};

describe("rangeIterator", () => {
  describe("number overload", () => {
    it("yields 0 .. end-1 with step 1", () => {
      expect(collect(rangeIterator(5))).toEqual([0, 1, 2, 3, 4]);
    });

    it("yields nothing when end is 0", () => {
      expect(collect(rangeIterator(0))).toEqual([]);
    });

    it("yields nothing when end is negative", () => {
      expect(collect(rangeIterator(-3))).toEqual([]);
    });

    it("throws TypeError when end is NaN", () => {
      expect(() => rangeIterator(Number.NaN)).toThrow(new TypeError("Range options must be a number got NaN instead"));
    });
  });

  describe("RangeOptions overload", () => {
    it("yields values from start to end (exclusive) with given step", () => {
      expect(
        collect(
          rangeIterator({
            start: 2,
            end: 8,
            step: 2,
          }),
        ),
      ).toEqual([2, 4, 6]);
    });

    it("yields nothing when start equals end", () => {
      expect(
        collect(
          rangeIterator({
            start: 3,
            end: 3,
            step: 1,
          }),
        ),
      ).toEqual([]);
    });

    it("yields nothing when start is already past end", () => {
      expect(
        collect(
          rangeIterator({
            start: 10,
            end: 5,
            step: 1,
          }),
        ),
      ).toEqual([]);
    });
  });

  describe("nextBack", () => {
    it("yields values from the back with step 1", () => {
      expect(collectBack(rangeIterator(5))).toEqual([4, 3, 2, 1, 0]);
    });

    it("starts from the last value reachable by step", () => {
      expect(collectBack(rangeIterator({ start: 2, end: 9, step: 3 }))).toEqual([8, 5, 2]);
    });

    it("excludes end when it lands exactly on a step", () => {
      expect(collectBack(rangeIterator({ start: 2, end: 8, step: 2 }))).toEqual([6, 4, 2]);
    });

    it("yields a single value", () => {
      expect(collectBack(rangeIterator(1))).toEqual([0]);
    });

    it("yields nothing for an empty range", () => {
      expect(rangeIterator(0).nextBack()).toEqual({ done: true, value: undefined });
      expect(rangeIterator({ start: 10, end: 5, step: 1 }).nextBack()).toEqual({ done: true, value: undefined });
    });

    it("stays done after exhaustion", () => {
      const cursor = rangeIterator(1);

      cursor.nextBack();

      expect(cursor.nextBack()).toEqual({ done: true, value: undefined });
      expect(cursor.nextBack()).toEqual({ done: true, value: undefined });
    });

    it("returns the last value immediately for a large range", () => {
      expect(rangeIterator(1_000_000).nextBack()).toEqual({ done: false, value: 999_999 });
    });
  });

  describe("mixed next and nextBack", () => {
    it("consumes from both ends without overlap", () => {
      const cursor = rangeIterator(5);

      expect(cursor.next().value).toBe(0);
      expect(cursor.nextBack().value).toBe(4);
      expect(cursor.next().value).toBe(1);
      expect(cursor.nextBack().value).toBe(3);
      expect(cursor.next().value).toBe(2);
      expect(cursor.next().done).toBe(true);
      expect(cursor.nextBack().done).toBe(true);
    });

    it("meets in the middle with a custom step", () => {
      const cursor = rangeIterator({ start: 1, end: 10, step: 2 });

      expect(cursor.nextBack().value).toBe(9);
      expect(cursor.next().value).toBe(1);
      expect(cursor.nextBack().value).toBe(7);
      expect(cursor.next().value).toBe(3);
      expect(cursor.next().value).toBe(5);
      expect(cursor.nextBack().done).toBe(true);
    });

    it("iterates the remaining middle after taking from the back", () => {
      const cursor = rangeIterator(5);

      cursor.nextBack();
      cursor.nextBack();

      expect(collect(cursor)).toEqual([0, 1, 2]);
    });
  });

  describe("iterable protocol", () => {
    it("returns itself from Symbol.iterator", () => {
      const cursor = rangeIterator(3);

      expect(cursor[Symbol.iterator]()).toBe(cursor);
    });

    it("is single-pass", () => {
      const cursor = rangeIterator(3);

      expect(collect(cursor)).toEqual([0, 1, 2]);
      expect(collect(cursor)).toEqual([]);
    });
  });
});

describe("isRangeOptions", () => {
  it("checks type", () => {
    expect(
      isRangeOptions({
        start: 1,
        end: 1,
        step: 1,
      }),
    ).toBe(true);
    expect(isRangeOptions(null)).toBe(false);
  });

  it("checks empty object", () => {
    expect(isRangeOptions({})).toBe(false);
  });

  it("checks random object", () => {
    expect(isRangeOptions({ foo: 2, boo: 4, step: 1 })).toBe(false);
  });

  it("checks partial options", () => {
    expect(isRangeOptions({ step: 1 })).toBe(false);
    expect(isRangeOptions({ start: 1, end: 4 })).toBe(false);
    expect(isRangeOptions({ end: 4, step: 2 })).toBe(false);
  });

  it("passes object with spare fields", () => {
    expect(
      isRangeOptions({
        start: 1,
        end: 1,
        step: 1,
        foo: "foo",
        bar: "bar",
      }),
    ).toBe(true);
  });

  it("checks array", () => {
    expect(isRangeOptions([1, 2, 4])).toBe(false);
    expect(isRangeOptions([])).toBe(false);
  });
});
