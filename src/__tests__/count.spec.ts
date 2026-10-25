import { describe, it, expect } from "@jest/globals";
import "../count.js";
import "../enumerate.js";
import "../filter.js";
import "../flat-map.js";
import "../limit.js";
import "../map.js";
import "../skip.js";
import { intoIter } from "../into-iter-factory.js";

describe("IntoIter count", () => {
  describe("known length", () => {
    it("counts an array", () => {
      expect(intoIter([1, 2, 3]).count()).toBe(3);
    });

    it("counts an empty array as zero", () => {
      expect(intoIter<number>([]).count()).toBe(0);
    });

    it("counts a string by its UTF-16 length", () => {
      expect(intoIter("abc").count()).toBe(3);
      expect(intoIter("").count()).toBe(0);
    });

    it("counts a range", () => {
      expect(intoIter(10).count()).toBe(10);
      expect(intoIter({ start: 0, end: 10, step: 2 }).count()).toBe(5);
      expect(intoIter(0).count()).toBe(0);
    });

    it("counts a typed array", () => {
      expect(intoIter(new Uint8Array([1, 2, 3, 4])).count()).toBe(4);
    });

    it("counts a limited and skipped chain", () => {
      expect(intoIter(10).limit(3).count()).toBe(3);
      expect(intoIter(3).limit(10).count()).toBe(3);
      expect(intoIter(10).limit(0).count()).toBe(0);
      expect(intoIter(10).skip(3).count()).toBe(7);
      expect(intoIter(3).skip(10).count()).toBe(0);
    });

    it("counts a reversed chain as the same length", () => {
      expect(intoIter([1, 2, 3]).reversed.count()).toBe(3);
      expect(intoIter(10).reversed.skip(4).count()).toBe(6);
    });

    it("does not read elements when the length is already known", () => {
      const calls: number[] = [];
      const values = intoIter([1, 2, 3]).map((n) => {
        calls.push(n);
        return n * 10;
      });

      expect(values.count()).toBe(3);
      expect(values.enumerate().count()).toBe(3);
      expect(values.skip(1).count()).toBe(2);
      expect(calls).toEqual([]);
    });

    it("leaves the source readable", () => {
      const source = intoIter([1, 2, 3]);

      expect(source.count()).toBe(3);
      expect(source.count()).toBe(3);
      expect([...source]).toEqual([1, 2, 3]);
    });
  });

  describe("unknown length", () => {
    it("counts a Set by walking it", () => {
      expect(intoIter(new Set([1, 2, 2, 3])).count()).toBe(3);
      expect(intoIter(new Set<number>()).count()).toBe(0);
    });

    it("counts a Map by walking its entries", () => {
      expect(
        intoIter(
          new Map([
            ["a", 1],
            ["b", 2],
          ]),
        ).count(),
      ).toBe(2);
    });

    it("counts a generator by walking it", () => {
      function* values() {
        yield 1;
        yield 2;
        yield 3;
      }

      expect(intoIter(values()).count()).toBe(3);
    });

    it("counts a generator only once", () => {
      function* values() {
        yield 1;
        yield 2;
      }

      const source = intoIter(values());

      expect(source.count()).toBe(2);
      expect(source.count()).toBe(0);
    });

    it("counts matches after filter", () => {
      const filtered = intoIter([1, 2, 3, 4]).filter((n) => n % 2 === 0);

      expect(filtered.count()).toBe(2);
      expect(filtered.count()).toBe(2);
    });

    it("reads every element when the length is unknown", () => {
      const calls: number[] = [];

      expect(
        intoIter([1, 2, 3, 4])
          .filter((n) => {
            calls.push(n);
            return n > 2;
          })
          .count(),
      ).toBe(2);
      expect(calls).toEqual([1, 2, 3, 4]);
    });

    it("counts flattened values", () => {
      expect(
        intoIter([[1, 2], [], [3]])
          .flatten()
          .count(),
      ).toBe(3);
      expect(
        intoIter([1, 2, 3])
          .flatMap((n) => [n, n])
          .count(),
      ).toBe(6);
    });

    it("counts values kept by filterMap", () => {
      expect(
        intoIter([1, 2, 3])
          .filterMap((n) => (n === 2 ? undefined : n))
          .count(),
      ).toBe(2);
    });

    it("stops a limited generator at the limit", () => {
      let pulls = 0;
      function* values() {
        for (let n = 0; n < 10; n++) {
          pulls += 1;
          yield n;
        }
      }

      expect(intoIter(values()).limit(3).count()).toBe(3);
      expect(pulls).toBe(3);
    });

    it("walks a skipped generator through the whole source", () => {
      let pulls = 0;
      function* values() {
        for (let n = 0; n < 5; n++) {
          pulls += 1;
          yield n;
        }
      }

      expect(intoIter(values()).skip(2).count()).toBe(3);
      expect(pulls).toBe(5);
    });

    it("counts a Set again from the start", () => {
      const source = intoIter(new Set([1, 2, 3]));

      expect(source.skip(1).count()).toBe(2);
      expect(source.count()).toBe(3);
    });
  });
});
