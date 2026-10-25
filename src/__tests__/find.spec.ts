import { describe, it, expect } from "@jest/globals";
import "../filter.js";
import "../find.js";
import "../map.js";
import { intoIter } from "../into-iter-factory.js";

describe("IntoIter find", () => {
  describe("find", () => {
    it("returns the first match", () => {
      expect(intoIter([1, 2, 3, 4]).find((n) => n > 2)).toBe(3);
    });

    it("returns undefined when nothing matches", () => {
      expect(intoIter([1, 2, 3]).find((n) => n > 10)).toBeUndefined();
      expect(intoIter<number>([]).find((n) => n > 0)).toBeUndefined();
    });

    it("keeps falsy matches, including null", () => {
      expect(intoIter([0, 1, 2]).find((n) => n === 0)).toBe(0);
      expect(intoIter([false, true]).find((value) => value === false)).toBe(false);
      expect(intoIter(["", "a"]).find((value) => value === "")).toBe("");
      expect(intoIter([null, 1]).find((value) => value === null)).toBeNull();
    });

    it("stops at the first match", () => {
      const calls: number[] = [];

      expect(
        intoIter([1, 2, 3, 4])
          .map((n) => {
            calls.push(n);
            return n;
          })
          .find((n) => n > 2),
      ).toBe(3);
      expect(calls).toEqual([1, 2, 3]);
    });
  });

  describe("findMap", () => {
    it("returns the first mapped value and skips null and undefined", () => {
      const calls: number[] = [];

      expect(
        intoIter([1, 2, 3, 4]).findMap((n) => {
          calls.push(n);
          if (n === 1) return undefined;
          if (n === 2) return null;
          return n * 10;
        }),
      ).toBe(30);
      expect(calls).toEqual([1, 2, 3]);
    });

    it("keeps falsy mapped values other than null and undefined", () => {
      expect(intoIter([1, 0, 2]).findMap((n) => (n === 1 ? undefined : n))).toBe(0);
      expect(intoIter([false, true]).findMap((value) => value)).toBe(false);
      expect(intoIter(["", "a"]).findMap((value) => value)).toBe("");
    });

    it("returns undefined when every value is skipped", () => {
      expect(intoIter([1, 2, 3]).findMap(() => undefined)).toBeUndefined();
      expect(intoIter<number>([]).findMap((n) => n)).toBeUndefined();
    });
  });

  describe("position", () => {
    it("returns the index of the first match", () => {
      expect(intoIter([1, 2, 3, 4]).position((n) => n > 2)).toBe(2);
      expect(intoIter([5]).position((n) => n === 5)).toBe(0);
    });

    it("returns undefined when nothing matches", () => {
      expect(intoIter([1, 2, 3]).position((n) => n > 10)).toBeUndefined();
      expect(intoIter<number>([]).position((n) => n > 0)).toBeUndefined();
    });

    it("counts from the back after reversed", () => {
      expect(intoIter([1, 2, 3, 4]).reversed.position((n) => n === 2)).toBe(2);
    });

    it("counts the filtered sequence", () => {
      expect(
        intoIter([1, 2, 3, 4, 5, 6])
          .filter((n) => n % 2 === 0)
          .position((n) => n === 6),
      ).toBe(2);
    });

    it("stops at the first match", () => {
      const calls: number[] = [];

      intoIter([1, 2, 3, 4])
        .map((n) => {
          calls.push(n);
          return n;
        })
        .position((n) => n === 2);

      expect(calls).toEqual([1, 2]);
    });
  });

  describe("findLast", () => {
    it("returns the last match by walking backwards", () => {
      const calls: number[] = [];

      expect(
        intoIter([1, 2, 3, 4])
          .map((n) => {
            calls.push(n);
            return n;
          })
          .findLast((n) => n < 4),
      ).toBe(3);
      expect(calls).toEqual([4, 3]);
    });

    it("returns undefined when nothing matches", () => {
      expect(intoIter([1, 2, 3]).findLast((n) => n > 10)).toBeUndefined();
      expect(intoIter<number>([]).findLast((n) => n > 0)).toBeUndefined();
    });

    it("reads a forward-only source from the start and keeps the last match", () => {
      let pulls = 0;
      function* values() {
        for (const n of [1, 2, 3, 4]) {
          pulls += 1;
          yield n;
        }
      }

      expect(intoIter(values()).findLast((n) => n % 2 === 0)).toBe(4);
      expect(pulls).toBe(4);
      expect(intoIter(new Set([1, 2, 3, 4])).findLast((n) => n % 2 === 0)).toBe(4);
    });

    it("leaves the source readable", () => {
      const source = intoIter([1, 2, 3, 4]);

      expect(source.find((n) => n > 2)).toBe(3);
      expect(source.findLast((n) => n < 4)).toBe(3);
      expect(source.position((n) => n === 1)).toBe(0);
      expect([...source]).toEqual([1, 2, 3, 4]);
    });
  });
});
