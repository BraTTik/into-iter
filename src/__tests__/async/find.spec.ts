import { describe, expect, it } from "@jest/globals";
import { intoIter } from "../../into-iter-factory.js";
import "../../async/filter.js";
import "../../async/find.js";
import "../../async/map.js";

const replayable = <T>(values: T[]) => ({
  [Symbol.asyncIterator]() {
    let index = 0;
    return {
      async next(): Promise<IteratorResult<T>> {
        if (index >= values.length) return { done: true, value: undefined };
        return { done: false, value: values[index++] as T };
      },
    };
  },
});

describe("AsyncIntoIter find", () => {
  describe("find", () => {
    it("returns the first match", async () => {
      expect(await intoIter(replayable([1, 2, 3, 4])).find((n) => n > 2)).toBe(3);
    });

    it("returns undefined when nothing matches", async () => {
      expect(await intoIter(replayable([1, 2, 3])).find((n) => n > 10)).toBeUndefined();
      expect(await intoIter(replayable<number>([])).find((n) => n > 0)).toBeUndefined();
    });

    it("keeps falsy matches, including null", async () => {
      expect(await intoIter(replayable([0, 1, 2])).find((n) => n === 0)).toBe(0);
      expect(await intoIter(replayable([false, true])).find((value) => value === false)).toBe(false);
      expect(await intoIter(replayable(["", "a"])).find((value) => value === "")).toBe("");
      expect(await intoIter(replayable([null, 1])).find((value) => value === null)).toBeNull();
    });

    it("stops at the first match", async () => {
      const calls: number[] = [];

      expect(
        await intoIter(replayable([1, 2, 3, 4]))
          .map((n) => {
            calls.push(n);
            return n;
          })
          .find((n) => n > 2),
      ).toBe(3);
      expect(calls).toEqual([1, 2, 3]);
    });

    it("awaits an async predicate", async () => {
      expect(await intoIter(replayable([1, 2, 3, 4])).find(async (n) => n > 2)).toBe(3);
    });
  });

  describe("findMap", () => {
    it("returns the first mapped value and skips null and undefined", async () => {
      const calls: number[] = [];

      expect(
        await intoIter(replayable([1, 2, 3, 4])).findMap((n) => {
          calls.push(n);
          if (n === 1) return undefined;
          if (n === 2) return null;
          return n * 10;
        }),
      ).toBe(30);
      expect(calls).toEqual([1, 2, 3]);
    });

    it("keeps falsy mapped values other than null and undefined", async () => {
      expect(await intoIter(replayable([1, 0, 2])).findMap((n) => (n === 1 ? undefined : n))).toBe(0);
      expect(await intoIter(replayable([false, true])).findMap((value) => value)).toBe(false);
      expect(await intoIter(replayable(["", "a"])).findMap((value) => value)).toBe("");
    });

    it("returns undefined when every value is skipped", async () => {
      expect(await intoIter(replayable([1, 2, 3])).findMap(() => undefined)).toBeUndefined();
      expect(await intoIter(replayable<number>([])).findMap((n) => n)).toBeUndefined();
    });

    it("awaits an async function", async () => {
      expect(await intoIter(replayable([1, 2, 3])).findMap(async (n) => (n === 1 ? undefined : n * 10))).toBe(20);
    });
  });

  describe("position", () => {
    it("returns the index of the first match", async () => {
      expect(await intoIter(replayable([1, 2, 3, 4])).position((n) => n > 2)).toBe(2);
      expect(await intoIter(replayable([5])).position((n) => n === 5)).toBe(0);
    });

    it("returns undefined when nothing matches", async () => {
      expect(await intoIter(replayable([1, 2, 3])).position((n) => n > 10)).toBeUndefined();
      expect(await intoIter(replayable<number>([])).position((n) => n > 0)).toBeUndefined();
    });

    it("counts the filtered sequence", async () => {
      expect(
        await intoIter(replayable([1, 2, 3, 4, 5, 6]))
          .filter((n) => n % 2 === 0)
          .position((n) => n === 6),
      ).toBe(2);
    });

    it("stops at the first match", async () => {
      const calls: number[] = [];

      await intoIter(replayable([1, 2, 3, 4]))
        .map((n) => {
          calls.push(n);
          return n;
        })
        .position((n) => n === 2);

      expect(calls).toEqual([1, 2]);
    });
  });

  describe("findLast", () => {
    it("reads from the start and keeps the last match", async () => {
      let pulls = 0;
      async function* values(): AsyncGenerator<number> {
        for (const n of [1, 2, 3, 4]) {
          pulls += 1;
          yield n;
        }
      }

      expect(await intoIter(values()).findLast((n) => n % 2 === 0)).toBe(4);
      expect(pulls).toBe(4);
    });

    it("returns undefined when nothing matches", async () => {
      expect(await intoIter(replayable([1, 2, 3])).findLast((n) => n > 10)).toBeUndefined();
      expect(await intoIter(replayable<number>([])).findLast((n) => n > 0)).toBeUndefined();
    });

    it("awaits an async predicate", async () => {
      expect(await intoIter(replayable([1, 2, 3, 4])).findLast(async (n) => n < 4)).toBe(3);
    });
  });

  it("leaves a replayable source readable and continues a generator after an early match", async () => {
    const source = intoIter(replayable([1, 2, 3, 4]));

    expect(await source.find((n) => n > 2)).toBe(3);
    expect(await source.findLast((n) => n < 4)).toBe(3);
    expect(await source.position((n) => n === 1)).toBe(0);

    async function* once(): AsyncGenerator<number> {
      yield 1;
      yield 2;
      yield 3;
    }

    const generated = intoIter(once());

    expect(await generated.find((n) => n === 1)).toBe(1);
    expect(await generated.find((n) => n > 0)).toBe(2);
  });
});
