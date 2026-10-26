import { describe, expect, it } from "@jest/globals";
import { intoIter } from "../../into-iter-factory.js";
import "../../async/filter.js";
import "../../async/map.js";
import "../../async/math.js";

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

describe("AsyncIntoIter math", () => {
  describe("sum", () => {
    it("adds numbers", async () => {
      expect(await intoIter(replayable([1, 2, 3, 4])).sum()).toBe(10);
      expect(await intoIter(replayable([-2, 5])).sum()).toBe(3);
      expect(await intoIter(replayable([0])).sum()).toBe(0);
    });

    it("returns zero for an empty number sequence", async () => {
      expect(await intoIter(replayable<number>([])).sum()).toBe(0);
    });

    it("adds bigints", async () => {
      expect(await intoIter(replayable([1n, 2n, 3n])).sum()).toBe(6n);
      expect(await intoIter(replayable([-2n, 5n])).sum()).toBe(3n);
    });

    it("returns the number zero for an empty bigint sequence", async () => {
      const total: number | bigint = await intoIter(replayable<bigint>([])).sum();

      expect(total).toBe(0);
    });
  });

  describe("product", () => {
    it("multiplies numbers", async () => {
      expect(await intoIter(replayable([2, 3, 4])).product()).toBe(24);
      expect(await intoIter(replayable([-2, 3])).product()).toBe(-6);
      expect(await intoIter(replayable([0, 5])).product()).toBe(0);
      expect(await intoIter(replayable([7])).product()).toBe(7);
    });

    it("returns one for an empty number sequence", async () => {
      expect(await intoIter(replayable<number>([])).product()).toBe(1);
    });

    it("multiplies bigints", async () => {
      expect(await intoIter(replayable([2n, 3n, 4n])).product()).toBe(24n);
      expect(await intoIter(replayable([0n, 5n])).product()).toBe(0n);
    });

    it("returns the number one for an empty bigint sequence", async () => {
      const total: number | bigint = await intoIter(replayable<bigint>([])).product();

      expect(total).toBe(1);
    });
  });

  describe("avg", () => {
    it("divides the sum by the length", async () => {
      expect(await intoIter(replayable([1, 2])).avg()).toBe(1.5);
      expect(await intoIter(replayable([1, 2, 3])).avg()).toBe(2);
      expect(await intoIter(replayable([4])).avg()).toBe(4);
    });

    it("returns NaN for an empty number sequence", async () => {
      expect(await intoIter(replayable<number>([])).avg()).toBeNaN();
    });

    it("divides bigints with integer division", async () => {
      expect(await intoIter(replayable([1n, 2n, 3n])).avg()).toBe(2n);
      expect(await intoIter(replayable([1n, 2n])).avg()).toBe(1n);
      expect(await intoIter(replayable([-5n, 0n])).avg()).toBe(-2n);
      expect(await intoIter(replayable([4n])).avg()).toBe(4n);
    });

    it("returns NaN for an empty bigint sequence", async () => {
      const average: number | bigint = await intoIter(replayable<bigint>([])).avg();

      expect(average).toBeNaN();
    });
  });

  describe("min and max", () => {
    it("finds the smallest and largest number", async () => {
      expect(await intoIter(replayable([3, 1, 2])).min()).toBe(1);
      expect(await intoIter(replayable([3, 1, 2])).max()).toBe(3);
      expect(await intoIter(replayable([-1, -5, 2])).min()).toBe(-5);
      expect(await intoIter(replayable([0, 1])).min()).toBe(0);
      expect(await intoIter(replayable([4])).max()).toBe(4);
    });

    it("finds the smallest and largest bigint", async () => {
      expect(await intoIter(replayable([3n, 1n, 2n])).min()).toBe(1n);
      expect(await intoIter(replayable([3n, 1n, 2n])).max()).toBe(3n);
      expect(await intoIter(replayable([-1n, -5n])).min()).toBe(-5n);
      expect(await intoIter(replayable([0n, 1n])).min()).toBe(0n);
    });

    it("returns undefined for an empty sequence", async () => {
      expect(await intoIter(replayable<number>([])).min()).toBeUndefined();
      expect(await intoIter(replayable<number>([])).max()).toBeUndefined();
      expect(await intoIter(replayable<bigint>([])).min()).toBeUndefined();
      expect(await intoIter(replayable<bigint>([])).max()).toBeUndefined();
    });

    it("keeps a finite number when another value is NaN", async () => {
      expect(await intoIter(replayable([1, Number.NaN])).min()).toBe(1);
      expect(await intoIter(replayable([1, Number.NaN])).max()).toBe(1);
    });

    it("keeps NaN when it is the first value", async () => {
      expect(await intoIter(replayable([Number.NaN, 1])).min()).toBeNaN();
      expect(await intoIter(replayable([Number.NaN, 1])).max()).toBeNaN();
    });
  });

  describe("chains", () => {
    it("reads a mapped chain only when the aggregate runs", async () => {
      const calls: number[] = [];
      const values = intoIter(replayable([1, 2, 3])).map((n) => {
        calls.push(n);
        return n * 10;
      });

      expect(calls).toEqual([]);
      expect(await values.sum()).toBe(60);
      expect(calls).toEqual([1, 2, 3]);
    });

    it("sums the values kept by filter", async () => {
      expect(
        await intoIter(replayable([1, 2, 3, 4]))
          .filter((n) => n % 2 === 0)
          .sum(),
      ).toBe(6);
    });

    it("leaves a replayable source readable and exhausts a generator", async () => {
      const source = intoIter(replayable([1, 2, 3]));

      expect(await source.sum()).toBe(6);
      expect(await source.product()).toBe(6);
      expect(await source.min()).toBe(1);

      async function* once() {
        yield 1;
        yield 2;
      }

      const generated = intoIter(once());

      expect(await generated.sum()).toBe(3);
      expect(await generated.sum()).toBe(0);
    });
  });

  describe("types", () => {
    it("rejects a string sequence", () => {
      const words = intoIter(replayable(["a", "b"]));

      // @ts-expect-error sum exists only for number and bigint
      words.sum();
      // @ts-expect-error min exists only for number and bigint
      words.min();
    });

    it("rejects a sequence that mixes numbers and bigints", () => {
      const mixed = intoIter(replayable<number | bigint>([1, 2n]));

      // @ts-expect-error number and bigint cannot be added together
      mixed.sum();
      // @ts-expect-error number and bigint cannot be compared
      mixed.max();
    });
  });
});
