import { describe, expect, it } from "@jest/globals";
import { intoIter } from "../../into-iter-factory.js";
import "../../async/filter.js";
import "../../async/map.js";
import "../../async/reduce.js";

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

describe("AsyncIntoIter reduce", () => {
  it("returns undefined for an empty sequence and does not call fn", async () => {
    const calls: number[] = [];

    expect(
      await intoIter(replayable<number>([])).reduce((acc, n) => {
        calls.push(n);
        return acc + n;
      }),
    ).toBeUndefined();
    expect(calls).toEqual([]);
  });

  it("returns the only element without calling fn", async () => {
    let calls = 0;

    expect(
      await intoIter(replayable([7])).reduce((acc, n) => {
        calls += 1;
        return acc + n;
      }),
    ).toBe(7);
    expect(calls).toBe(0);
  });

  it("folds from the left", async () => {
    expect(await intoIter(replayable([1, 2, 3, 4])).reduce((acc, n) => acc - n)).toBe(-8);
    expect(await intoIter(replayable(["a", "b", "c"])).reduce((acc, s) => acc + s)).toBe("abc");
    expect(await intoIter(replayable([1n, 2n, 3n])).reduce((acc, n) => acc + n)).toBe(6n);
  });

  it("awaits an async function", async () => {
    expect(await intoIter(replayable([1, 2, 3, 4])).reduce(async (acc, n) => acc - n)).toBe(-8);
  });

  it("passes the accumulator and the next element", async () => {
    const calls: [number, number][] = [];

    const total = await intoIter(replayable([1, 2, 3, 4])).reduce((acc, n) => {
      calls.push([acc, n]);
      return acc + n;
    });

    expect(calls).toEqual([
      [1, 2],
      [3, 3],
      [6, 4],
    ]);
    expect(total).toBe(10);
  });

  it("reduces the values kept by filter", async () => {
    expect(
      await intoIter(replayable([1, 2, 3, 4]))
        .filter((n) => n % 2 === 0)
        .reduce((acc, n) => acc + n),
    ).toBe(6);
  });

  it("does not read the source until reduce runs", async () => {
    const calls: number[] = [];
    const values = intoIter(replayable([1, 2, 3])).map((n) => {
      calls.push(n);
      return n * 10;
    });

    expect(calls).toEqual([]);
    expect(await values.reduce((acc, n) => acc + n)).toBe(60);
    expect(calls).toEqual([1, 2, 3]);
  });

  it("leaves a replayable source readable and exhausts a generator", async () => {
    const source = intoIter(replayable([1, 2, 3]));

    expect(await source.reduce((acc, n) => acc + n)).toBe(6);
    expect(await source.reduce((acc, n) => acc + n)).toBe(6);

    async function* once(): AsyncGenerator<number> {
      yield 1;
      yield 2;
    }

    const generated = intoIter(once());

    expect(await generated.reduce((acc, n) => acc + n)).toBe(3);
    expect(await generated.reduce((acc, n) => acc + n)).toBeUndefined();
  });
});
