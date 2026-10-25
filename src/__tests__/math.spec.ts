import { describe, it, expect } from "@jest/globals";
import "../filter.js";
import "../map.js";
import "../math.js";
import { intoIter } from "../into-iter-factory.js";

describe("IntoIter math", () => {
  describe("sum", () => {
    it("adds numbers", () => {
      expect(intoIter([1, 2, 3, 4]).sum()).toBe(10);
      expect(intoIter([-2, 5]).sum()).toBe(3);
      expect(intoIter([0]).sum()).toBe(0);
    });

    it("returns zero for an empty number sequence", () => {
      expect(intoIter<number>([]).sum()).toBe(0);
    });

    it("adds bigints", () => {
      expect(intoIter([1n, 2n, 3n]).sum()).toBe(6n);
      expect(intoIter([-2n, 5n]).sum()).toBe(3n);
    });

    it("returns the number zero for an empty bigint sequence", () => {
      const total: number | bigint = intoIter<bigint>([]).sum();

      expect(total).toBe(0);
    });
  });

  describe("product", () => {
    it("multiplies numbers", () => {
      expect(intoIter([2, 3, 4]).product()).toBe(24);
      expect(intoIter([-2, 3]).product()).toBe(-6);
      expect(intoIter([0, 5]).product()).toBe(0);
      expect(intoIter([7]).product()).toBe(7);
    });

    it("returns one for an empty number sequence", () => {
      expect(intoIter<number>([]).product()).toBe(1);
    });

    it("multiplies bigints", () => {
      expect(intoIter([2n, 3n, 4n]).product()).toBe(24n);
      expect(intoIter([0n, 5n]).product()).toBe(0n);
    });

    it("returns the number one for an empty bigint sequence", () => {
      const total: number | bigint = intoIter<bigint>([]).product();

      expect(total).toBe(1);
    });
  });

  describe("avg", () => {
    it("divides the sum by the length", () => {
      expect(intoIter([1, 2]).avg()).toBe(1.5);
      expect(intoIter([1, 2, 3]).avg()).toBe(2);
      expect(intoIter([4]).avg()).toBe(4);
    });

    it("returns NaN for an empty number sequence", () => {
      expect(intoIter<number>([]).avg()).toBeNaN();
    });

    it("divides bigints with integer division", () => {
      expect(intoIter([1n, 2n, 3n]).avg()).toBe(2n);
      expect(intoIter([1n, 2n]).avg()).toBe(1n);
      expect(intoIter([-5n, 0n]).avg()).toBe(-2n);
      expect(intoIter([4n]).avg()).toBe(4n);
    });

    it("returns NaN for an empty bigint sequence", () => {
      const average: number | bigint = intoIter<bigint>([]).avg();

      expect(average).toBeNaN();
    });
  });

  describe("min and max", () => {
    it("finds the smallest and largest number", () => {
      expect(intoIter([3, 1, 2]).min()).toBe(1);
      expect(intoIter([3, 1, 2]).max()).toBe(3);
      expect(intoIter([-1, -5, 2]).min()).toBe(-5);
      expect(intoIter([0, 1]).min()).toBe(0);
      expect(intoIter([4]).max()).toBe(4);
    });

    it("finds the smallest and largest bigint", () => {
      expect(intoIter([3n, 1n, 2n]).min()).toBe(1n);
      expect(intoIter([3n, 1n, 2n]).max()).toBe(3n);
      expect(intoIter([-1n, -5n]).min()).toBe(-5n);
      expect(intoIter([0n, 1n]).min()).toBe(0n);
    });

    it("returns undefined for an empty sequence", () => {
      expect(intoIter<number>([]).min()).toBeUndefined();
      expect(intoIter<number>([]).max()).toBeUndefined();
      expect(intoIter<bigint>([]).min()).toBeUndefined();
      expect(intoIter<bigint>([]).max()).toBeUndefined();
    });

    it("keeps a finite number when another value is NaN", () => {
      expect(intoIter([1, Number.NaN]).min()).toBe(1);
      expect(intoIter([1, Number.NaN]).max()).toBe(1);
    });

    it("keeps NaN when it is the first value", () => {
      expect(intoIter([Number.NaN, 1]).min()).toBeNaN();
      expect(intoIter([Number.NaN, 1]).max()).toBeNaN();
    });
  });

  describe("chains", () => {
    it("reads a mapped chain only when the aggregate runs", () => {
      const calls: number[] = [];
      const values = intoIter([1, 2, 3]).map((n) => {
        calls.push(n);
        return n * 10;
      });

      expect(calls).toEqual([]);
      expect(values.sum()).toBe(60);
      expect(calls).toEqual([1, 2, 3]);
    });

    it("sums the values kept by filter", () => {
      expect(
        intoIter([1, 2, 3, 4])
          .filter((n) => n % 2 === 0)
          .sum(),
      ).toBe(6);
    });

    it("does not depend on reversed order", () => {
      const source = intoIter([1, 5, 2]);

      expect(source.reversed.sum()).toBe(8);
      expect(source.reversed.min()).toBe(1);
      expect(source.reversed.max()).toBe(5);
    });

    it("leaves the source readable", () => {
      const source = intoIter([1, 2, 3]);

      expect(source.sum()).toBe(6);
      expect(source.product()).toBe(6);
      expect(source.min()).toBe(1);
      expect([...source]).toEqual([1, 2, 3]);
    });
  });

  describe("types", () => {
    it("rejects a string sequence", () => {
      const words = intoIter(["a", "b"]);

      // @ts-expect-error sum exists only for number and bigint
      words.sum();
      // @ts-expect-error min exists only for number and bigint
      words.min();
    });

    it("rejects a sequence that mixes numbers and bigints", () => {
      const mixed = intoIter<number | bigint>([1, 2n]);

      // @ts-expect-error number and bigint cannot be added together
      mixed.sum();
      // @ts-expect-error number and bigint cannot be compared
      mixed.max();
    });
  });
});
