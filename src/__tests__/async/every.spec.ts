import { describe, expect, it } from "@jest/globals";
import { intoIter } from "../../into-iter-factory.js";
import "../../async/every.js";
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

describe("AsyncIntoIter every and some", () => {
  describe("every", () => {
    it("returns true for an empty sequence and does not call fn", async () => {
      const calls: number[] = [];

      expect(
        await intoIter(replayable<number>([])).every((n) => {
          calls.push(n);
          return true;
        }),
      ).toBe(true);
      expect(calls).toEqual([]);
    });

    it("returns true when every element matches", async () => {
      expect(await intoIter(replayable([1, 2, 3])).every((n) => n > 0)).toBe(true);
    });

    it("stops at the first element that does not match", async () => {
      const calls: number[] = [];

      expect(
        await intoIter(replayable([1, 2, 3, 4]))
          .map((n) => {
            calls.push(n);
            return n;
          })
          .every((n) => n < 3),
      ).toBe(false);
      expect(calls).toEqual([1, 2, 3]);
    });

    it("keeps falsy values in the check", async () => {
      expect(
        await intoIter(replayable([0, false, ""])).every((value) => value === 0 || value === false || value === ""),
      ).toBe(true);
    });

    it("awaits an async predicate", async () => {
      expect(await intoIter(replayable([1, 2, 3])).every(async (n) => n > 0)).toBe(true);
      expect(await intoIter(replayable([1, 0, 3])).every(async (n) => n > 0)).toBe(false);
    });
  });

  describe("some", () => {
    it("returns false for an empty sequence and does not call fn", async () => {
      const calls: number[] = [];

      expect(
        await intoIter(replayable<number>([])).some((n) => {
          calls.push(n);
          return true;
        }),
      ).toBe(false);
      expect(calls).toEqual([]);
    });

    it("returns false when no element matches", async () => {
      expect(await intoIter(replayable([1, 2, 3])).some((n) => n > 10)).toBe(false);
    });

    it("stops at the first matching element", async () => {
      const calls: number[] = [];

      expect(
        await intoIter(replayable([1, 2, 3, 4]))
          .map((n) => {
            calls.push(n);
            return n;
          })
          .some((n) => n > 2),
      ).toBe(true);
      expect(calls).toEqual([1, 2, 3]);
    });

    it("awaits an async predicate", async () => {
      expect(await intoIter(replayable([1, 2, 3])).some(async (n) => n > 2)).toBe(true);
    });
  });

  describe("chains", () => {
    it("does not read the source until the check runs", async () => {
      const calls: number[] = [];
      const values = intoIter(replayable([1, 2, 3])).map((n) => {
        calls.push(n);
        return n;
      });

      const pending = values.every((n) => n > 0);

      expect(calls).toEqual([]);
      expect(await pending).toBe(true);
      expect(calls).toEqual([1, 2, 3]);
    });

    it("leaves a replayable source readable and exhausts a generator", async () => {
      const source = intoIter(replayable([1, 2, 3]));

      expect(await source.every((n) => n > 0)).toBe(true);
      expect(await source.some((n) => n === 2)).toBe(true);

      async function* once(): AsyncGenerator<number> {
        yield 1;
        yield 2;
      }

      const generated = intoIter(once());

      expect(await generated.every((n) => n > 0)).toBe(true);
      expect(await generated.some((n) => n > 0)).toBe(false);
    });
  });
});
