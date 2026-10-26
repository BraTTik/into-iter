import { describe, expect, it } from "@jest/globals";
import { intoIter } from "../../into-iter-factory.js";
import "../../async/map-while.js";
import "../../async/map.js";

const read = async <T>(source: AsyncIterable<T>, limit = 8): Promise<T[]> => {
  const values: T[] = [];
  for await (const value of source) {
    values.push(value);
    if (values.length > limit) {
      throw new Error(`iterator did not finish, received ${JSON.stringify(values)}`);
    }
  }
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

const parse = (s: string) => {
  const n = Number(s);
  return Number.isNaN(n) ? undefined : n;
};

describe("AsyncIntoIter mapWhile", () => {
  it("yields mapped values until the function returns undefined", async () => {
    expect(await read(intoIter(replayable(["1", "2", "x", "4"])).mapWhile(parse))).toEqual([1, 2]);
  });

  it("stops on null as well as undefined", async () => {
    expect(await read(intoIter(replayable([1, 2, null, 4])).mapWhile((value) => value))).toEqual([1, 2]);
  });

  it("keeps falsy mapped values other than null and undefined", async () => {
    expect(await read(intoIter(replayable([1, 0, 2])).mapWhile((n) => (n === 2 ? undefined : n)))).toEqual([1, 0]);
    expect(
      await read(intoIter(replayable([false, "", "x"])).mapWhile((value) => (value === "x" ? undefined : value))),
    ).toEqual([false, ""]);
  });

  it("yields nothing when the first call returns undefined", async () => {
    const calls: number[] = [];

    expect(
      await read(
        intoIter(replayable([1, 2, 3])).mapWhile((n) => {
          calls.push(n);
          return undefined;
        }),
      ),
    ).toEqual([]);
    expect(calls).toStrictEqual([1]);
  });

  it("maps every element when none of the results are nullish", async () => {
    const calls: number[] = [];

    expect(
      await read(
        intoIter(replayable([1, 2, 3])).mapWhile((n) => {
          calls.push(n);
          return n * 10;
        }),
      ),
    ).toEqual([10, 20, 30]);
    expect(calls).toStrictEqual([1, 2, 3]);
  });

  it("yields nothing for an empty source and does not call fn", async () => {
    const calls: number[] = [];

    expect(
      await read(
        intoIter(replayable<number>([])).mapWhile((n) => {
          calls.push(n);
          return n;
        }),
      ),
    ).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("awaits an async function", async () => {
    expect(await read(intoIter(replayable(["1", "2", "x", "4"])).mapWhile(async (s) => parse(s)))).toEqual([1, 2]);
  });

  it("stays done after a nullish result and does not call fn again", async () => {
    const calls: number[] = [];
    const cursor = intoIter(replayable([1, 2, 3, 4]))
      .mapWhile((n) => {
        calls.push(n);
        return n < 3 ? n * 10 : undefined;
      })
      [Symbol.asyncIterator]();

    expect(await cursor.next()).toEqual({ done: false, value: 10 });
    expect(await cursor.next()).toEqual({ done: false, value: 20 });
    expect(await cursor.next()).toEqual({ done: true, value: undefined });
    expect(await cursor.next()).toEqual({ done: true, value: undefined });
    expect(calls).toStrictEqual([1, 2, 3]);
  });

  it("does not call fn after the source ends", async () => {
    const calls: number[] = [];
    const cursor = intoIter(replayable([1, 2]))
      .mapWhile((n) => {
        calls.push(n);
        return n * 10;
      })
      [Symbol.asyncIterator]();

    expect(await cursor.next()).toEqual({ done: false, value: 10 });
    expect(await cursor.next()).toEqual({ done: false, value: 20 });
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
        .mapWhile((n) => n)
        [Symbol.asyncIterator]().remaining,
    ).toBeUndefined();
  });

  it("does not read the source until iteration starts", async () => {
    const calls: number[] = [];
    const values = intoIter(replayable([1, 2, 3, 4]))
      .map((n) => {
        calls.push(n);
        return n;
      })
      .mapWhile((n) => (n < 3 ? n * 10 : undefined));

    expect(calls).toEqual([]);
    expect(await read(values)).toEqual([10, 20]);
    expect(calls).toEqual([1, 2, 3]);
  });

  it("does not read past the nullish result", async () => {
    let pulls = 0;
    async function* values() {
      for (const n of [1, 2, 3, 4]) {
        pulls += 1;
        yield n;
      }
    }

    const cursor = intoIter(values())
      .mapWhile((n) => (n < 3 ? n * 10 : undefined))
      [Symbol.asyncIterator]();

    expect(await read(cursor)).toEqual([10, 20]);
    await cursor.next();
    expect(pulls).toBe(3);
  });

  it("continues a generator after the element that stopped the previous read", async () => {
    async function* values() {
      yield 1;
      yield 3;
      yield 2;
    }

    const iter = intoIter(values()).mapWhile((n) => (n === 3 ? undefined : n));

    expect(await read(iter)).toEqual([1]);
    expect(await read(iter)).toEqual([2]);
    expect(await read(iter)).toEqual([]);
  });

  it("leaves a replayable source readable", async () => {
    const source = intoIter(replayable(["1", "2", "x", "4"]));

    expect(await read(source.mapWhile(parse))).toEqual([1, 2]);
    expect(await read(source.mapWhile(parse))).toEqual([1, 2]);
    expect(await read(source)).toEqual(["1", "2", "x", "4"]);
  });

  it("checks fn against the element type", () => {
    const numbers = intoIter(replayable([1, 2, 3]));

    // @ts-expect-error fn receives numbers
    numbers.mapWhile((s: string) => s);
  });
});
