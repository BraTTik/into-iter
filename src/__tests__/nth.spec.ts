import { describe, it, expect } from "@jest/globals";
import "../map.js";
import "../nth.js";
import { intoIter } from "../into-iter-factory.js";

describe("IntoIter nth", () => {
  describe("nth and first", () => {
    it("returns the element at the index", () => {
      expect(intoIter([1, 2, 3, 4]).nth(0)).toBe(1);
      expect(intoIter([1, 2, 3, 4]).nth(2)).toBe(3);
      expect(intoIter([1, 2, 3, 4]).first()).toBe(1);
    });

    it("returns undefined when the index is past the end", () => {
      expect(intoIter([1, 2]).nth(5)).toBeUndefined();
      expect(intoIter<number>([]).nth(0)).toBeUndefined();
      expect(intoIter<number>([]).first()).toBeUndefined();
    });

    it("reads only the elements up to the index", () => {
      let pulls = 0;
      function* values() {
        for (let n = 0; n < 10; n += 1) {
          pulls += 1;
          yield n;
        }
      }

      expect(intoIter(values()).nth(2)).toBe(2);
      expect(pulls).toBe(3);
    });

    it("throws TypeError for an invalid index before reading", () => {
      let pulls = 0;
      function* values() {
        pulls += 1;
        yield 1;
      }
      const source = intoIter(values());

      expect(() => source.nth(-1)).toThrow(TypeError);
      expect(() => source.nth(1.5)).toThrow(TypeError);
      expect(() => source.nth(Number.NaN)).toThrow(TypeError);
      expect(() => intoIter([1]).nth(-1)).toThrow("Nth must be a non-negative integer");
      expect(pulls).toBe(0);
    });
  });

  describe("nthBack and last", () => {
    it("returns the element counted from the end", () => {
      expect(intoIter([1, 2, 3, 4, 5]).nthBack(0)).toBe(5);
      expect(intoIter([1, 2, 3, 4, 5]).nthBack(1)).toBe(4);
      expect(intoIter([1, 2, 3, 4, 5]).last()).toBe(5);
    });

    it("takes the last element in one backward step", () => {
      const calls: number[] = [];

      expect(
        intoIter([1, 2, 3])
          .map((n) => {
            calls.push(n);
            return n;
          })
          .last(),
      ).toBe(3);
      expect(calls).toEqual([3]);
    });

    it("walks backward only as far as the index", () => {
      const calls: number[] = [];

      expect(
        intoIter([1, 2, 3, 4, 5])
          .map((n) => {
            calls.push(n);
            return n;
          })
          .nthBack(1),
      ).toBe(4);
      expect(calls).toEqual([5, 4]);
    });

    it("returns undefined when the backward index is past the start", () => {
      expect(intoIter([1, 2, 3]).nthBack(5)).toBeUndefined();
      expect(intoIter<number>([]).nthBack(0)).toBeUndefined();
      expect(intoIter<number>([]).last()).toBeUndefined();
    });

    it("walks a forward-only source from the start", () => {
      let pulls = 0;
      function* values() {
        for (const n of [1, 2, 3, 4, 5]) {
          pulls += 1;
          yield n;
        }
      }

      expect(intoIter(values()).nthBack(1)).toBe(4);
      expect(pulls).toBe(5);
      expect(intoIter(new Set([1, 2, 3, 4, 5])).last()).toBe(5);
      expect(intoIter(new Set([1, 2, 3, 4, 5])).nthBack(1)).toBe(4);
      expect(intoIter(new Set([1, 2, 3])).nthBack(5)).toBeUndefined();
    });

    it("throws TypeError for an invalid index", () => {
      expect(() => intoIter([1, 2, 3]).nthBack(-1)).toThrow("Nth must be a non-negative integer");
      expect(() => intoIter([1]).nthBack(1.5)).toThrow(TypeError);
      expect(() => intoIter([1]).nthBack(Number.NaN)).toThrow(TypeError);
    });
  });

  describe("chains", () => {
    it("follows reversed ends", () => {
      const source = intoIter([1, 2, 3]);

      expect(source.reversed.first()).toBe(3);
      expect(source.reversed.last()).toBe(1);
      expect(source.reversed.nth(1)).toBe(2);
      expect(source.reversed.nthBack(1)).toBe(2);
    });

    it("leaves the source readable", () => {
      const source = intoIter([1, 2, 3, 4]);

      expect(source.first()).toBe(1);
      expect(source.last()).toBe(4);
      expect(source.nth(2)).toBe(3);
      expect([...source]).toEqual([1, 2, 3, 4]);
    });
  });
});
