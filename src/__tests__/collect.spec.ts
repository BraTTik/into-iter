import { describe, it, expect } from "@jest/globals";
import "../map.js";
import { collector, type Collector } from "../collect.js";
import { intoIter } from "../into-iter-factory.js";

describe("IntoIter collect", () => {
  describe("array", () => {
    it("fills an empty array and returns it", () => {
      const target: number[] = [];

      expect(intoIter([1, 2, 3]).collect(target)).toBe(target);
      expect(target).toEqual([1, 2, 3]);
    });

    it("appends to the elements already in the array", () => {
      const target = [0];

      intoIter([1, 2]).collect(target);

      expect(target).toEqual([0, 1, 2]);
    });

    it("collects a reversed chain", () => {
      expect(intoIter([1, 2, 3]).reversed.collect([])).toEqual([3, 2, 1]);
    });

    it("leaves the source readable", () => {
      const source = intoIter([1, 2, 3]);

      expect(source.collect([])).toEqual([1, 2, 3]);
      expect(source.collect([])).toEqual([1, 2, 3]);
    });
  });

  describe("Set", () => {
    it("fills an empty Set and returns it", () => {
      const target = new Set<number>();

      expect(intoIter([1, 2, 2, 3]).collect(target)).toBe(target);
      expect(target).toEqual(new Set([1, 2, 3]));
    });

    it("adds to the values already in the Set", () => {
      const target = new Set([0]);

      intoIter([1, 2]).collect(target);

      expect([...target]).toEqual([0, 1, 2]);
    });
  });

  describe("Map", () => {
    it("fills a Map from pairs and returns it", () => {
      const pairs: [string, number][] = [
        ["a", 1],
        ["b", 2],
      ];
      const target = new Map<string, number>();

      expect(intoIter(pairs).collect(target)).toBe(target);
      expect(target).toEqual(new Map(pairs));
    });

    it("overwrites a key that is already present", () => {
      const target = new Map<string, number>([["a", 0]]);
      const pairs: [string, number][] = [
        ["a", 1],
        ["b", 2],
      ];

      intoIter(pairs).collect(target);

      expect([...target]).toEqual([
        ["a", 1],
        ["b", 2],
      ]);
    });
  });

  describe("toArray, toSet and toMap", () => {
    it("builds an array", () => {
      expect(intoIter([1, 2, 3]).toArray()).toEqual([1, 2, 3]);
    });

    it("builds a Set", () => {
      expect(intoIter([1, 2, 2, 3]).toSet()).toEqual(new Set([1, 2, 3]));
    });

    it("builds a Map from pairs", () => {
      const pairs: [string, number][] = [
        ["a", 1],
        ["b", 2],
      ];

      expect(intoIter(pairs).toMap()).toEqual(new Map(pairs));
    });

    it("builds an empty collection from an empty source", () => {
      expect(intoIter<number>([]).toArray()).toEqual([]);
      expect(intoIter<number>([]).toSet()).toEqual(new Set());
      expect(intoIter<[string, number]>([]).toMap()).toEqual(new Map());
    });
  });

  describe("custom collector", () => {
    it("returns the value from finish", () => {
      const target = {
        [collector](): Collector<number, string> {
          const items: number[] = [];
          return {
            add(value) {
              items.push(value);
            },
            finish() {
              return items.join(",");
            },
          };
        },
      };

      expect(intoIter([1, 2, 3]).collect(target)).toBe("1,2,3");
    });

    it("calls finish once after every element", () => {
      const added: number[] = [];
      let finished = 0;
      const target = {
        [collector](): Collector<number, number> {
          return {
            add(value) {
              added.push(value);
            },
            finish() {
              finished += 1;
              return added.length;
            },
          };
        },
      };

      expect(intoIter([1, 2]).collect(target)).toBe(2);
      expect(added).toEqual([1, 2]);
      expect(finished).toBe(1);
    });

    it("calls finish for an empty source", () => {
      let finished = 0;
      const target = {
        [collector](): Collector<number, string> {
          return {
            add() {
              throw new Error("empty source has no elements");
            },
            finish() {
              finished += 1;
              return "empty";
            },
          };
        },
      };

      expect(intoIter<number>([]).collect(target)).toBe("empty");
      expect(finished).toBe(1);
    });
  });

  describe("laziness", () => {
    it("does not read the source until collect runs", () => {
      const calls: number[] = [];
      const values = intoIter([1, 2, 3]).map((n) => {
        calls.push(n);
        return n * 10;
      });

      expect(calls).toEqual([]);
      expect(values.collect([])).toEqual([10, 20, 30]);
      expect(calls).toEqual([1, 2, 3]);
    });
  });
});
