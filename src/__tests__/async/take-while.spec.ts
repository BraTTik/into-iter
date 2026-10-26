import { describe, expect, it } from "@jest/globals";
import { intoIter } from "../../into-iter-factory.js";
import "../../async/map.js";
import "../../async/take-while.js";

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

describe("AsyncIntoIter takeWhile", () => {
  it("yields the prefix while the predicate holds", async () => {
    expect(await read(intoIter(replayable([1, 2, 5, 3])).takeWhile((n) => n < 4))).toEqual([1, 2]);
  });

  it("yields nothing when the first element fails", async () => {
    expect(await read(intoIter(replayable([5, 1, 2])).takeWhile((n) => n < 4))).toEqual([]);
  });

  it("yields the whole source when every element matches", async () => {
    expect(await read(intoIter(replayable([1, 2, 3])).takeWhile(() => true))).toEqual([1, 2, 3]);
  });

  it("yields nothing for an empty source and does not call the predicate", async () => {
    const calls: number[] = [];

    expect(
      await read(
        intoIter(replayable<number>([])).takeWhile((n) => {
          calls.push(n);
          return n > 0;
        }),
      ),
    ).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("keeps falsy values that match", async () => {
    expect(await read(intoIter(replayable([0, 1, 2])).takeWhile((n) => n < 2))).toEqual([0, 1]);
    expect(await read(intoIter(replayable([false, "", "stop", true])).takeWhile((value) => value !== "stop"))).toEqual([
      false,
      "",
    ]);
  });

  it("does not yield elements after the first failure", async () => {
    expect(await read(intoIter(replayable([1, 5, 2, 3])).takeWhile((n) => n < 4))).toEqual([1]);
  });

  it("awaits an async predicate", async () => {
    expect(await read(intoIter(replayable([1, 2, 5, 3])).takeWhile(async (n) => n < 4))).toEqual([1, 2]);
  });

  it("stays done after the predicate fails", async () => {
    const cursor = intoIter(replayable([1, 2, 5, 3]))
      .takeWhile((n) => n < 4)
      [Symbol.asyncIterator]();

    expect(await cursor.next()).toEqual({ done: false, value: 1 });
    expect(await cursor.next()).toEqual({ done: false, value: 2 });
    expect(await cursor.next()).toEqual({ done: true, value: undefined });
    expect(await cursor.next()).toEqual({ done: true, value: undefined });
  });

  it("does not call the predicate on a done result", async () => {
    const calls: Array<number | undefined> = [];
    const cursor = intoIter(replayable([1, 2]))
      .takeWhile((n) => {
        calls.push(n);
        return true;
      })
      [Symbol.asyncIterator]();

    expect(await cursor.next()).toEqual({ done: false, value: 1 });
    expect(await cursor.next()).toEqual({ done: false, value: 2 });
    expect(await cursor.next()).toEqual({ done: true, value: undefined });
    expect(await cursor.next()).toEqual({ done: true, value: undefined });
    expect(calls).toEqual([1, 2]);
  });

  it("drops remaining", () => {
    const source = {
      [Symbol.asyncIterator]() {
        return {
          async next(): Promise<IteratorResult<number>> {
            return { done: true, value: undefined };
          },
          remaining: () => 3,
        };
      },
    };

    expect(
      intoIter(source)
        .takeWhile(() => true)
        [Symbol.asyncIterator]().remaining,
    ).toBeUndefined();
  });

  it("does not read the source until iteration starts", async () => {
    const calls: number[] = [];
    const values = intoIter(replayable([1, 2, 5, 3]))
      .map((n) => {
        calls.push(n);
        return n;
      })
      .takeWhile((n) => n < 4);

    expect(calls).toEqual([]);
    expect(await read(values)).toEqual([1, 2]);
    expect(calls).toEqual([1, 2, 5]);
  });

  it("does not read past the first failing element", async () => {
    let pulls = 0;
    async function* values() {
      for (const n of [1, 2, 5, 3, 4]) {
        pulls += 1;
        yield n;
      }
    }

    const cursor = intoIter(values())
      .takeWhile((n) => n < 4)
      [Symbol.asyncIterator]();

    expect(await read(cursor)).toEqual([1, 2]);
    await cursor.next();
    expect(pulls).toBe(3);
  });

  it("continues a generator after the element that stopped the previous read", async () => {
    async function* values() {
      yield 1;
      yield 2;
      yield 5;
      yield 3;
    }

    const iter = intoIter(values()).takeWhile((n) => n < 4);

    expect(await read(iter)).toEqual([1, 2]);
    expect(await read(iter)).toEqual([3]);
    expect(await read(iter)).toEqual([]);
  });

  it("leaves a replayable source readable", async () => {
    const source = intoIter(replayable([1, 2, 5, 3]));

    expect(await read(source.takeWhile((n) => n < 4))).toEqual([1, 2]);
    expect(await read(source.takeWhile((n) => n < 4))).toEqual([1, 2]);
    expect(await read(source)).toEqual([1, 2, 5, 3]);
  });

  it("checks the predicate against the element type", () => {
    const numbers = intoIter(replayable([1, 2, 3]));

    // @ts-expect-error predicate receives numbers
    numbers.takeWhile((s: string) => s.length > 0);
  });
});
