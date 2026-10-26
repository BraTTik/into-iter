import { describe, expect, it } from "@jest/globals";
import { intoIter } from "../../into-iter-factory.js";
import "../../async/filter.js";
import "../../async/map.js";

const read = async <T>(source: AsyncIterable<T>): Promise<T[]> => {
  const values: T[] = [];
  for await (const value of source) values.push(value);
  return values;
};

const replayable = (values: number[]) => ({
  [Symbol.asyncIterator]() {
    let index = 0;
    return {
      async next(): Promise<IteratorResult<number>> {
        if (index >= values.length) return { done: true, value: undefined };
        return { done: false, value: values[index++] as number };
      },
    };
  },
});

describe("AsyncIntoIter filter", () => {
  it("does not call the predicate until iteration starts", () => {
    const calls: number[] = [];

    intoIter(replayable([1, 2, 3])).filter((n) => {
      calls.push(n);
      return true;
    });

    expect(calls).toEqual([]);
  });

  it("calls the predicate only until the requested element is found", async () => {
    const calls: number[] = [];
    const iter = intoIter(replayable([1, 2, 3, 4])).filter((n) => {
      calls.push(n);
      return n % 2 === 0;
    });
    const cursor = iter[Symbol.asyncIterator]();

    expect(await cursor.next()).toEqual({ done: false, value: 2 });
    expect(calls).toEqual([1, 2]);
    expect(await cursor.next()).toEqual({ done: false, value: 4 });
    expect(calls).toEqual([1, 2, 3, 4]);
  });

  it("does not call the predicate on a done result", async () => {
    const calls: number[] = [];
    const cursor = intoIter(replayable([1]))
      .filter((n) => {
        calls.push(n);
        return false;
      })
      [Symbol.asyncIterator]();

    expect(await cursor.next()).toEqual({ done: true, value: undefined });
    expect(calls).toEqual([1]);
    expect(await cursor.next()).toEqual({ done: true, value: undefined });
    expect(calls).toEqual([1]);
  });

  it("reads a replayable source again from the start", async () => {
    const iter = intoIter(replayable([1, 2, 3, 4])).filter((n) => n % 2 === 0);

    expect(await read(iter)).toEqual([2, 4]);
    expect(await read(iter)).toEqual([2, 4]);
  });

  it("awaits an async predicate", async () => {
    const iter = intoIter(replayable([1, 2, 3])).filter(async (n) => n > 1);

    expect(await read(iter)).toEqual([2, 3]);
  });

  it("drops remaining", () => {
    const source = {
      [Symbol.asyncIterator]() {
        const cursor = {
          left: 2,
          async next(): Promise<IteratorResult<number>> {
            if (this.left === 0) return { done: true, value: undefined };
            this.left -= 1;
            return { done: false, value: this.left };
          },
          remaining() {
            return this.left;
          },
        };
        return cursor;
      },
    };

    const cursor = intoIter(source)
      .filter(() => true)
      [Symbol.asyncIterator]();

    expect(cursor.remaining).toBeUndefined();
  });

  it("reads a generator only once", async () => {
    async function* once() {
      yield 1;
      yield 2;
      yield 3;
    }

    const iter = intoIter(once()).filter((n) => n > 1);

    expect(await read(iter)).toEqual([2, 3]);
    expect(await read(iter)).toEqual([]);
  });

  it("keeps a second filter independent after the first is consumed", async () => {
    const source = intoIter(replayable([1, 2, 3]));
    const first = source.filter((n) => n > 1);

    expect(await read(first)).toEqual([2, 3]);

    const second = source.filter((n) => n < 3);

    expect(await read(second)).toEqual([1, 2]);
    expect(await read(first)).toEqual([2, 3]);
  });

  it("chains map and filter and replays both", async () => {
    const calls: number[] = [];
    const iter = intoIter(replayable([0, 1, 2, 3, 4]))
      .map((n) => {
        calls.push(n);
        return n + 1;
      })
      .filter((n) => n % 2 === 0);

    expect(await read(iter)).toEqual([2, 4]);
    expect(calls).toEqual([0, 1, 2, 3, 4]);
    expect(await read(iter)).toEqual([2, 4]);
    expect(calls).toEqual([0, 1, 2, 3, 4, 0, 1, 2, 3, 4]);
  });
});
