import { describe, expect, it } from "@jest/globals";
import { intoIter } from "../../into-iter-factory.js";
import "../../async/filter.js";
import "../../async/fold.js";
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

describe("AsyncIntoIter fold", () => {
  it("returns the initial value for an empty sequence and does not call fn", async () => {
    const calls: number[] = [];

    expect(
      await intoIter(replayable<number>([])).fold(10, (acc, n) => {
        calls.push(n);
        return acc + n;
      }),
    ).toBe(10);
    expect(calls).toEqual([]);
  });

  it("calls fn for every element, including the first", async () => {
    const calls: [number, number][] = [];

    const total = await intoIter(replayable([1, 2, 3])).fold(10, (acc, n) => {
      calls.push([acc, n]);
      return acc + n;
    });

    expect(calls).toEqual([
      [10, 1],
      [11, 2],
      [13, 3],
    ]);
    expect(total).toBe(16);
    expect(await intoIter(replayable([1n, 2n, 3n])).fold(10n, (acc, n) => acc + n)).toBe(16n);
  });

  it("awaits an async function", async () => {
    expect(await intoIter(replayable([1, 2, 3])).fold(10, async (acc, n) => acc + n)).toBe(16);
  });

  it("builds a value of a different type", async () => {
    expect(await intoIter(replayable([1, 2, 3])).fold("", (acc, n) => acc + n)).toBe("123");
    expect(await intoIter(replayable([1, 2, 3])).fold(0, (acc, n) => acc * 10 + n)).toBe(123);
  });

  it("folds the values kept by filter", async () => {
    expect(
      await intoIter(replayable([1, 2, 3, 4]))
        .filter((n) => n % 2 === 0)
        .fold(0, (acc, n) => acc + n),
    ).toBe(6);
  });

  it("does not read the source until fold runs", async () => {
    const calls: number[] = [];
    const values = intoIter(replayable([1, 2, 3])).map((n) => {
      calls.push(n);
      return n * 10;
    });

    expect(calls).toEqual([]);
    expect(await values.fold(0, (acc, n) => acc + n)).toBe(60);
    expect(calls).toEqual([1, 2, 3]);
  });

  it("leaves a replayable source readable and exhausts a generator", async () => {
    const source = intoIter(replayable([1, 2, 3]));

    expect(await source.fold(0, (acc, n) => acc + n)).toBe(6);
    expect(await source.fold("", (acc, n) => acc + n)).toBe("123");

    async function* once(): AsyncGenerator<number> {
      yield 1;
      yield 2;
    }

    const generated = intoIter(once());

    expect(await generated.fold(0, (acc, n) => acc + n)).toBe(3);
    expect(await generated.fold(0, (acc, n) => acc + n)).toBe(0);
  });
});
