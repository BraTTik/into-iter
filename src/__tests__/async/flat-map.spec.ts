import { describe, expect, it } from "@jest/globals";
import { intoIter } from "../../into-iter-factory.js";
import "../../async/flat-map.js";
import "../../async/limit.js";

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

describe("AsyncIntoIter flatMap", () => {
  it("expands each element into several values", async () => {
    expect(await read(intoIter(replayable([1, 2, 3])).flatMap((n) => [n, n * 10]))).toEqual([1, 10, 2, 20, 3, 30]);
  });

  it("flattens one level", async () => {
    expect(await read(intoIter(replayable([[[1, 2]], [[3]]])).flatMap((row) => row))).toEqual([[1, 2], [3]]);
  });

  it("flattens a string, a Set, and a Map", async () => {
    expect(await read(intoIter(replayable([1])).flatMap(() => "ab"))).toEqual(["a", "b"]);
    expect(await read(intoIter(replayable([1, 2])).flatMap((n) => new Set([n, n * 10])))).toEqual([1, 10, 2, 20]);
    expect(await read(intoIter(replayable(["a"])).flatMap((key) => new Map([[key, key.length]])))).toEqual([["a", 1]]);
  });

  it("awaits a promised iterable and reads an async iterable", async () => {
    async function* pair(n: number) {
      yield n;
      yield n * 10;
    }

    expect(await read(intoIter(replayable([1, 2])).flatMap(async (n) => [n, n + 1]))).toEqual([1, 2, 2, 3]);
    expect(await read(intoIter(replayable([1, 2])).flatMap((n) => pair(n)))).toEqual([1, 10, 2, 20]);
  });

  it("prefers the async iterator when the inner value has both", async () => {
    const both = {
      *[Symbol.iterator]() {
        yield "sync";
      },
      async *[Symbol.asyncIterator]() {
        yield "async";
      },
    };

    expect(await read(intoIter(replayable([0])).flatMap(() => both))).toEqual(["async"]);
  });

  it("skips empty inner sequences", async () => {
    expect(await read(intoIter(replayable([[1], [], [2, 3]])).flatMap((row) => row))).toEqual([1, 2, 3]);
    expect(await read(intoIter(replayable([1, 2, 3])).flatMap(() => []))).toEqual([]);
    expect(await read(intoIter(replayable<number[]>([])).flatMap((row) => row))).toEqual([]);
  });

  it("throws TypeError when the callback result is not iterable", async () => {
    const iter = intoIter(replayable([1])).flatMap(() => 1 as unknown as Iterable<number>);

    await expect(read(iter)).rejects.toThrow(TypeError);
  });

  it("stays done after exhaustion and does not call the callback again", async () => {
    const calls: number[] = [];
    const cursor = intoIter(replayable([1]))
      .flatMap((n) => {
        calls.push(n);
        return [n];
      })
      [Symbol.asyncIterator]();

    expect(await cursor.next()).toEqual({ done: false, value: 1 });
    expect(await cursor.next()).toEqual({ done: true, value: undefined });
    expect(await cursor.next()).toEqual({ done: true, value: undefined });
    expect(calls).toEqual([1]);
  });

  it("does not call the callback until iteration starts", () => {
    const calls: number[] = [];

    intoIter(replayable([1, 2, 3])).flatMap((n) => {
      calls.push(n);
      return [n];
    });

    expect(calls).toEqual([]);
  });

  it("does not open rows past the consumed elements", async () => {
    const calls: number[][] = [];
    const iter = intoIter(
      replayable([
        [1, 2],
        [3, 4],
        [5, 6],
      ]),
    )
      .flatMap((row) => {
        calls.push(row);
        return row;
      })
      .limit(2);

    expect(await read(iter)).toEqual([1, 2]);
    expect(calls).toEqual([[1, 2]]);
  });

  it("opens the next row only to satisfy the limit", async () => {
    const calls: number[][] = [];

    expect(
      await read(
        intoIter(
          replayable([
            [1, 2],
            [3, 4],
            [5, 6],
          ]),
        )
          .flatMap((row) => {
            calls.push(row);
            return row;
          })
          .limit(3),
      ),
    ).toEqual([1, 2, 3]);
    expect(calls).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("stops an infinite inner sequence", async () => {
    let yielded = 0;
    async function* naturals() {
      for (let n = 0; ; n++) {
        yielded += 1;
        yield n;
      }
    }

    expect(
      await read(
        intoIter(replayable([0]))
          .flatMap(() => naturals())
          .limit(3),
      ),
    ).toEqual([0, 1, 2]);
    expect(yielded).toBe(3);
  });

  it("reads a replayable source again from the start", async () => {
    const iter = intoIter(replayable([1, 2])).flatMap((n) => [n, n * 10]);

    expect(await read(iter)).toEqual([1, 10, 2, 20]);
    expect(await read(iter)).toEqual([1, 10, 2, 20]);
  });

  it("continues a generator from the next unopened row", async () => {
    async function* rows() {
      yield [1, 2];
      yield [3, 4];
    }

    const iter = intoIter(rows())
      .flatMap((row) => row)
      .limit(1);

    expect(await read(iter)).toEqual([1]);
    expect(await read(iter)).toEqual([3]);
    expect(await read(iter)).toEqual([]);
  });

  it("drops remaining", () => {
    const source = {
      [Symbol.asyncIterator]() {
        return {
          async next(): Promise<IteratorResult<number[]>> {
            return { done: true, value: undefined };
          },
          remaining: () => 2,
        };
      },
    };

    expect(
      intoIter(source)
        .flatMap((row) => row)
        [Symbol.asyncIterator]().remaining,
    ).toBeUndefined();
  });
});

describe("AsyncIntoIter flatten", () => {
  it("flattens one level of sync and async rows", async () => {
    async function* pair() {
      yield 1;
      yield 2;
    }

    expect(
      await read(
        intoIter(
          replayable([
            [1, 2],
            [3, 4],
          ]),
        ).flatten(),
      ),
    ).toEqual([1, 2, 3, 4]);
    expect(await read(intoIter(replayable([[[1, 2]], [[3]]])).flatten())).toEqual([[1, 2], [3]]);
    expect(await read(intoIter(replayable(["ab", "c"])).flatten())).toEqual(["a", "b", "c"]);
    expect(await read(intoIter(replayable([pair(), [3]])).flatten())).toEqual([1, 2, 3]);
  });

  it("removes the next level with a second flatten", async () => {
    expect(
      await read(
        intoIter(replayable([[[1, 2]], [[3]]]))
          .flatten()
          .flatten(),
      ),
    ).toEqual([1, 2, 3]);
  });
});

describe("AsyncIntoIter filterMap", () => {
  it("skips null and undefined and keeps other falsy values", async () => {
    expect(await read(intoIter(replayable([1, 2, 3])).filterMap((n) => (n === 2 ? null : n)))).toEqual([1, 3]);
    expect(await read(intoIter(replayable([1, 2, 3])).filterMap(() => undefined))).toEqual([]);
    expect(await read(intoIter(replayable([0, false, "", 1])).filterMap((value) => value))).toEqual([0, false, "", 1]);
  });

  it("returns a produced array as one element", async () => {
    expect(await read(intoIter(replayable([1])).filterMap(() => [1, 2]))).toEqual([[1, 2]]);
  });

  it("awaits the callback and stops calling it after the requested value", async () => {
    const calls: number[] = [];
    const cursor = intoIter(replayable([1, 2, 3, 4]))
      .filterMap(async (n) => {
        calls.push(n);
        return n % 2 === 0 ? n : undefined;
      })
      [Symbol.asyncIterator]();

    expect(await cursor.next()).toEqual({ done: false, value: 2 });
    expect(calls).toEqual([1, 2]);
    expect(await cursor.next()).toEqual({ done: false, value: 4 });
    expect(calls).toEqual([1, 2, 3, 4]);
  });

  it("does not read past a following limit", async () => {
    const calls: number[] = [];

    expect(
      await read(
        intoIter(replayable([1, 2, 3, 4, 5]))
          .filterMap((n) => {
            calls.push(n);
            return n % 2 === 0 ? n : undefined;
          })
          .limit(1),
      ),
    ).toEqual([2]);
    expect(calls).toEqual([1, 2]);
  });

  it("reads a replayable source again from the start", async () => {
    const iter = intoIter(replayable([1, 2, 3])).filterMap((n) => (n % 2 === 0 ? n * 10 : undefined));

    expect(await read(iter)).toEqual([20]);
    expect(await read(iter)).toEqual([20]);
  });
});
