import { describe, expect, it } from "@jest/globals";
import { intoIter } from "../../into-iter-factory.js";
import "../../async/count.js";
import "../../async/enumerate.js";
import "../../async/filter.js";
import "../../async/flat-map.js";
import "../../async/limit.js";
import "../../async/map.js";
import "../../async/skip.js";

const read = async <T>(source: AsyncIterable<T>): Promise<T[]> => {
  const values: T[] = [];
  for await (const value of source) values.push(value);
  return values;
};

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

const counted = (values: number[]) => ({
  [Symbol.asyncIterator]() {
    const cursor = {
      index: 0,
      async next(): Promise<IteratorResult<number>> {
        if (this.index >= values.length) return { done: true, value: undefined };
        return { done: false, value: values[this.index++] as number };
      },
      remaining() {
        return values.length - this.index;
      },
    };
    return cursor;
  },
});

describe("AsyncIntoIter count", () => {
  it("returns a known length without reading elements", async () => {
    const calls: number[] = [];
    const values = intoIter(counted([1, 2, 3])).map((n) => {
      calls.push(n);
      return n * 10;
    });

    expect(await values.count()).toBe(3);
    expect(await values.enumerate().count()).toBe(3);
    expect(await values.skip(1).count()).toBe(2);
    expect(await values.limit(2).count()).toBe(2);
    expect(await intoIter(counted([])).count()).toBe(0);
    expect(
      await intoIter(counted([1, 2, 3]))
        .limit(0)
        .count(),
    ).toBe(0);
    expect(
      await intoIter(counted([1, 2, 3]))
        .skip(10)
        .count(),
    ).toBe(0);
    expect(calls).toEqual([]);
  });

  it("leaves a source with a known length readable", async () => {
    const source = intoIter(counted([1, 2, 3]));

    expect(await source.count()).toBe(3);
    expect(await source.count()).toBe(3);
    expect(await read(source)).toEqual([1, 2, 3]);
  });

  it("walks a source of unknown length", async () => {
    expect(await intoIter(replayable([1, 2, 3])).count()).toBe(3);
    expect(await intoIter(replayable<number>([])).count()).toBe(0);
  });

  it("reads every element when the length is unknown", async () => {
    const calls: number[] = [];

    expect(
      await intoIter(replayable([1, 2, 3, 4]))
        .filter((n) => {
          calls.push(n);
          return n > 2;
        })
        .count(),
    ).toBe(2);
    expect(calls).toEqual([1, 2, 3, 4]);
  });

  it("counts a replayable filtered source again", async () => {
    const filtered = intoIter(replayable([1, 2, 3, 4])).filter((n) => n % 2 === 0);

    expect(await filtered.count()).toBe(2);
    expect(await filtered.count()).toBe(2);
  });

  it("counts a generator by walking it and only once", async () => {
    async function* values() {
      yield 1;
      yield 2;
    }

    const source = intoIter(values());

    expect(await source.count()).toBe(2);
    expect(await source.count()).toBe(0);
  });

  it("counts flattened values and values kept by filterMap", async () => {
    expect(
      await intoIter(replayable([[1, 2], [], [3]]))
        .flatten()
        .count(),
    ).toBe(3);
    expect(
      await intoIter(replayable([1, 2, 3]))
        .flatMap((n) => [n, n])
        .count(),
    ).toBe(6);
    expect(
      await intoIter(replayable([1, 2, 3]))
        .filterMap((n) => (n === 2 ? undefined : n))
        .count(),
    ).toBe(2);
  });

  it("stops a limited generator at the limit", async () => {
    let pulls = 0;
    async function* values() {
      for (let n = 0; n < 10; n += 1) {
        pulls += 1;
        yield n;
      }
    }

    expect(await intoIter(values()).limit(3).count()).toBe(3);
    expect(pulls).toBe(3);
  });

  it("walks a skipped generator through the whole source", async () => {
    let pulls = 0;
    async function* values() {
      for (let n = 0; n < 5; n += 1) {
        pulls += 1;
        yield n;
      }
    }

    expect(await intoIter(values()).skip(2).count()).toBe(3);
    expect(pulls).toBe(5);
  });
});
