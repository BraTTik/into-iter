import { describe, expect, it } from "@jest/globals";
import { intoIter } from "../../into-iter-factory.js";
import "../../async/limit.js";
import "../../async/map.js";
import "../../async/skip-while.js";

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

describe("AsyncIntoIter skipWhile", () => {
  it("drops the prefix and yields the rest, including the first failure", async () => {
    expect(await read(intoIter(replayable([1, 2, 5, 3])).skipWhile((n) => n < 4))).toEqual([5, 3]);
  });

  it("yields the whole source when the first element fails", async () => {
    const calls: number[] = [];

    expect(
      await read(
        intoIter(replayable([5, 1, 2])).skipWhile((n) => {
          calls.push(n);
          return n < 4;
        }),
      ),
    ).toEqual([5, 1, 2]);
    expect(calls).toStrictEqual([5]);
  });

  it("yields nothing when every element matches and does not call the predicate past the end", async () => {
    const calls: number[] = [];

    expect(
      await read(
        intoIter(replayable([1, 2, 3])).skipWhile((n) => {
          calls.push(n);
          return n < 10;
        }),
      ),
    ).toEqual([]);
    expect(calls).toStrictEqual([1, 2, 3]);
  });

  it("yields nothing for an empty source and does not call the predicate", async () => {
    const calls: number[] = [];

    expect(
      await read(
        intoIter(replayable<number>([])).skipWhile((n) => {
          calls.push(n);
          return n > 0;
        }),
      ),
    ).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("drops falsy values that match and keeps the first failure", async () => {
    expect(await read(intoIter(replayable([0, 1, 2])).skipWhile((n) => n < 2))).toEqual([2]);
    expect(await read(intoIter(replayable([false, "", "stop", true])).skipWhile((value) => value !== "stop"))).toEqual([
      "stop",
      true,
    ]);
  });

  it("yields later elements even when they would match the predicate", async () => {
    const calls: number[] = [];

    expect(
      await read(
        intoIter(replayable([1, 5, 2])).skipWhile((n) => {
          calls.push(n);
          return n < 4;
        }),
      ),
    ).toEqual([5, 2]);
    expect(calls).toStrictEqual([1, 5]);
  });

  it("awaits an async predicate", async () => {
    expect(await read(intoIter(replayable([1, 2, 5, 3])).skipWhile(async (n) => n < 4))).toEqual([5, 3]);
  });

  it("keeps yielding after the first failure", async () => {
    const cursor = intoIter(replayable([1, 2, 5, 3, 0]))
      .skipWhile((n) => n < 4)
      [Symbol.asyncIterator]();

    expect(await cursor.next()).toEqual({ done: false, value: 5 });
    expect(await cursor.next()).toEqual({ done: false, value: 3 });
    expect(await cursor.next()).toEqual({ done: false, value: 0 });
    expect(await cursor.next()).toEqual({ done: true, value: undefined });
    expect(await cursor.next()).toEqual({ done: true, value: undefined });
  });

  it("does not call the predicate after the source ends", async () => {
    const calls: number[] = [];
    const cursor = intoIter(replayable([1, 2]))
      .skipWhile((n) => {
        calls.push(n);
        return n < 4;
      })
      [Symbol.asyncIterator]();

    expect(await cursor.next()).toEqual({ done: true, value: undefined });
    expect(await cursor.next()).toEqual({ done: true, value: undefined });
    expect(calls).toStrictEqual([1, 2]);
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
        .skipWhile(() => false)
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
      .skipWhile((n) => n < 4);

    expect(calls).toEqual([]);
    expect(await read(values)).toEqual([5, 3]);
    expect(calls).toEqual([1, 2, 5, 3]);
  });

  it("does not read past the element that was requested", async () => {
    let pulls = 0;
    async function* values() {
      for (const n of [1, 2, 5, 3, 4]) {
        pulls += 1;
        yield n;
      }
    }

    const cursor = intoIter(values())
      .skipWhile((n) => n < 4)
      [Symbol.asyncIterator]();

    expect(await cursor.next()).toEqual({ done: false, value: 5 });
    expect(pulls).toBe(3);
    expect(await cursor.next()).toEqual({ done: false, value: 3 });
    expect(pulls).toBe(4);
  });

  it("applies skipWhile again to the remainder of a generator", async () => {
    async function* values() {
      yield 1;
      yield 5;
      yield 2;
      yield 6;
    }

    const iter = intoIter(values())
      .skipWhile((n) => n < 4)
      .limit(1);

    expect(await read(iter)).toEqual([5]);
    expect(await read(iter)).toEqual([6]);
    expect(await read(iter)).toEqual([]);
  });

  it("leaves a replayable source readable", async () => {
    const source = intoIter(replayable([1, 2, 5, 3]));

    expect(await read(source.skipWhile((n) => n < 4))).toEqual([5, 3]);
    expect(await read(source.skipWhile((n) => n < 4))).toEqual([5, 3]);
    expect(await read(source)).toEqual([1, 2, 5, 3]);
  });

  it("checks the predicate against the element type", () => {
    const numbers = intoIter(replayable([1, 2, 3]));

    // @ts-expect-error predicate receives numbers
    numbers.skipWhile((s: string) => s.length > 0);
  });
});
