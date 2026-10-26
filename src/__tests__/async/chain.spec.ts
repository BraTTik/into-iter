import { describe, expect, it } from "@jest/globals";
import { intoIter } from "../../into-iter-factory.js";
import "../../async/chain.js";
import "../../async/map.js";

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

describe("AsyncIntoIter chain", () => {
  it("yields the first sequence and then the second", async () => {
    expect(await read(intoIter(replayable([1, 2])).chain([3, 4]))).toEqual([1, 2, 3, 4]);
    expect(await read(intoIter(replayable(["a", "b"])).chain("cd"))).toEqual(["a", "b", "c", "d"]);
    expect(await read(intoIter(replayable([1, 2])).chain(replayable([3, 4])))).toEqual([1, 2, 3, 4]);
  });

  it("skips an empty side", async () => {
    expect(await read(intoIter(replayable<number>([])).chain([1, 2]))).toEqual([1, 2]);
    expect(await read(intoIter(replayable([1, 2])).chain([]))).toEqual([1, 2]);
    expect(await read(intoIter(replayable<number>([])).chain([]))).toEqual([]);
  });

  it("keeps several chains in order", async () => {
    expect(
      await read(
        intoIter(replayable([1]))
          .chain([2])
          .chain(replayable([3, 4])),
      ),
    ).toEqual([1, 2, 3, 4]);
  });

  it("prefers the async iterator when the second side has both", async () => {
    const both = {
      *[Symbol.iterator]() {
        yield "sync";
      },
      async *[Symbol.asyncIterator]() {
        yield "async";
      },
    };

    expect(await read(intoIter(replayable(["a"])).chain(both))).toEqual(["a", "async"]);
  });

  it("accepts another AsyncIntoIter and leaves it readable", async () => {
    const other = intoIter(replayable([3, 4]));

    expect(await read(intoIter(replayable([1, 2])).chain(other))).toEqual([1, 2, 3, 4]);
    expect(await read(other)).toEqual([3, 4]);
  });

  it("accepts a synchronous IntoIter and leaves it readable", async () => {
    const other = intoIter([3, 4]);

    expect(await read(intoIter(replayable([1, 2])).chain(other))).toEqual([1, 2, 3, 4]);
    expect([...other]).toEqual([3, 4]);
  });

  it("does not open either side until iteration starts", async () => {
    const opened = { first: 0, second: 0 };
    const side = (name: "first" | "second", values: number[]) => ({
      async *[Symbol.asyncIterator]() {
        opened[name] += 1;
        yield* values;
      },
    });
    const chained = intoIter(side("first", [1, 2])).chain(side("second", [3, 4]));

    expect(opened).toEqual({ first: 0, second: 0 });
    expect(await read(chained)).toEqual([1, 2, 3, 4]);
    expect(opened).toEqual({ first: 1, second: 1 });
  });

  it("does not pull the second side until the first is exhausted", async () => {
    let opened = 0;
    const other = {
      async *[Symbol.asyncIterator]() {
        opened += 1;
        yield 3;
        yield 4;
      },
    };
    const calls: number[] = [];
    const cursor = intoIter(replayable([1, 2]))
      .map((n) => {
        calls.push(n);
        return n;
      })
      .chain(other)
      [Symbol.asyncIterator]();

    expect(await cursor.next()).toEqual({ done: false, value: 1 });
    expect(await cursor.next()).toEqual({ done: false, value: 2 });
    expect(opened).toBe(0);
    expect(calls).toEqual([1, 2]);
    expect(await cursor.next()).toEqual({ done: false, value: 3 });
    expect(opened).toBe(1);
    expect(calls).toEqual([1, 2]);
  });

  it("reads a replayable chain again from the start", async () => {
    const source = intoIter(replayable([1, 2]));
    const chained = source.chain([3, 4]);

    expect(await read(chained)).toEqual([1, 2, 3, 4]);
    expect(await read(chained)).toEqual([1, 2, 3, 4]);
    expect(await read(source)).toEqual([1, 2]);
  });

  it("reads a generator on the second side only once", async () => {
    async function* values() {
      yield 3;
      yield 4;
    }

    const chained = intoIter(replayable([1, 2])).chain(values());

    expect(await read(chained)).toEqual([1, 2, 3, 4]);
    expect(await read(chained)).toEqual([1, 2]);
  });

  it("reads a generator on the first side only once", async () => {
    async function* values(): AsyncGenerator<number> {
      yield 1;
      yield 2;
    }

    const chained = intoIter(values()).chain(replayable<number>([3, 4]));

    expect(await read(chained)).toEqual([1, 2, 3, 4]);
    expect(await read(chained)).toEqual([3, 4]);
  });

  it("stays done after exhaustion", async () => {
    const cursor = intoIter(replayable([1]))
      .chain([2])
      [Symbol.asyncIterator]();

    expect(await cursor.next()).toEqual({ done: false, value: 1 });
    expect(await cursor.next()).toEqual({ done: false, value: 2 });
    expect(await cursor.next()).toEqual({ done: true, value: undefined });
    expect(await cursor.next()).toEqual({ done: true, value: undefined });
  });

  it("sums the lengths when both sides know them", async () => {
    const cursor = intoIter(counted([1, 2]))
      .chain(counted([3, 4]))
      [Symbol.asyncIterator]();

    expect(cursor.remaining?.()).toBe(4);
    expect(await cursor.next()).toEqual({ done: false, value: 1 });
    expect(cursor.remaining?.()).toBe(3);
    expect(await cursor.next()).toEqual({ done: false, value: 2 });
    expect(cursor.remaining?.()).toBe(2);
    expect(await cursor.next()).toEqual({ done: false, value: 3 });
    expect(cursor.remaining?.()).toBe(1);
    expect(intoIter(counted([])).chain([])[Symbol.asyncIterator]().remaining?.()).toBe(0);
  });

  it("keeps the length of a synchronous array on the second side", () => {
    expect(
      intoIter(counted([1, 2]))
        .chain([3, 4, 5])
        [Symbol.asyncIterator]()
        .remaining?.(),
    ).toBe(5);
  });

  it("has no length when either side does not know it", () => {
    expect(
      intoIter(replayable([1, 2]))
        .chain(counted([3]))
        [Symbol.asyncIterator]().remaining,
    ).toBeUndefined();
    expect(
      intoIter(counted([1, 2]))
        .chain(replayable([3]))
        [Symbol.asyncIterator]().remaining,
    ).toBeUndefined();
    expect(
      intoIter(counted([1, 2]))
        .chain(new Set([3]))
        [Symbol.asyncIterator]().remaining,
    ).toBeUndefined();
  });

  it("requires the same element type", () => {
    const words = intoIter(replayable(["a", "b"]));

    // @ts-expect-error chain expects strings
    words.chain([1, 2]);
  });
});
