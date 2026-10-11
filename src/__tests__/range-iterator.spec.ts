import { describe, it, expect } from "@jest/globals";
import { rangeIterator } from "../range-iterator";

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
