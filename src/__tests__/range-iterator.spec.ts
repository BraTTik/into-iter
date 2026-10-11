import { describe, it, expect } from "@jest/globals";
import { rangeIterator, isRangeOptions } from "../range-iterator";

const collect = (iter: Iterable<number>): number[] => [...iter];

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
