import { describe, it, expect } from "@jest/globals";
import "../every.js";
import "../map.js";
import { intoIter } from "../into-iter-factory.js";

describe("IntoIter every and some", () => {
  describe("every", () => {
    it("returns true for an empty sequence and does not call fn", () => {
      const calls: number[] = [];

      expect(
        intoIter<number>([]).every((n) => {
          calls.push(n);
          return true;
        }),
      ).toBe(true);
      expect(calls).toEqual([]);
    });

    it("returns true when every element matches", () => {
      expect(intoIter([1, 2, 3]).every((n) => n > 0)).toBe(true);
    });

    it("stops at the first element that does not match", () => {
      const calls: number[] = [];

      expect(
        intoIter([1, 2, 3, 4])
          .map((n) => {
            calls.push(n);
            return n;
          })
          .every((n) => n < 3),
      ).toBe(false);
      expect(calls).toEqual([1, 2, 3]);
    });

    it("keeps falsy values in the check", () => {
      expect(intoIter([0, false, ""]).every((value) => value === 0 || value === false || value === "")).toBe(true);
    });
  });

  describe("some", () => {
    it("returns false for an empty sequence and does not call fn", () => {
      const calls: number[] = [];

      expect(
        intoIter<number>([]).some((n) => {
          calls.push(n);
          return true;
        }),
      ).toBe(false);
      expect(calls).toEqual([]);
    });

    it("returns false when no element matches", () => {
      expect(intoIter([1, 2, 3]).some((n) => n > 10)).toBe(false);
    });

    it("stops at the first matching element", () => {
      const calls: number[] = [];

      expect(
        intoIter([1, 2, 3, 4])
          .map((n) => {
            calls.push(n);
            return n;
          })
          .some((n) => n > 2),
      ).toBe(true);
      expect(calls).toEqual([1, 2, 3]);
    });
  });

  describe("chains", () => {
    it("checks a reversed chain from the back", () => {
      const calls: number[] = [];

      expect(
        intoIter([1, 2, 3, 4])
          .map((n) => {
            calls.push(n);
            return n;
          })
          .reversed.every((n) => n > 2),
      ).toBe(false);
      expect(calls).toEqual([4, 3, 2]);
    });

    it("leaves the source readable", () => {
      const source = intoIter([1, 2, 3]);

      expect(source.every((n) => n > 0)).toBe(true);
      expect(source.some((n) => n === 2)).toBe(true);
      expect([...source]).toEqual([1, 2, 3]);
    });
  });
});
