import { describe, expect, it } from "@jest/globals";
import { intoIter } from "../../into-iter-factory.js";
import "../../async/enumerate.js";
import "../../async/filter.js";
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

describe("AsyncIntoIter enumerate", () => {
  it("numbers values from zero", async () => {
    expect(await read(intoIter(replayable(["a", "b", "c"])).enumerate())).toEqual([
      [0, "a"],
      [1, "b"],
      [2, "c"],
    ]);
  });

  it("yields nothing for an empty source", async () => {
    expect(await read(intoIter(replayable<string>([])).enumerate())).toEqual([]);
  });

  it("stays done after exhaustion", async () => {
    const cursor = intoIter(replayable(["a"]))
      .enumerate()
      [Symbol.asyncIterator]();

    await cursor.next();

    expect(await cursor.next()).toEqual({ done: true, value: undefined });
    expect(await cursor.next()).toEqual({ done: true, value: undefined });
  });

  it("does not read the source until iteration starts", () => {
    const calls: number[] = [];

    intoIter(replayable([1, 2, 3]))
      .map((n) => {
        calls.push(n);
        return n;
      })
      .enumerate();

    expect(calls).toEqual([]);
  });

  it("numbers only consumed elements", async () => {
    const calls: number[] = [];
    const cursor = intoIter(replayable([1, 2, 3, 4]))
      .map((n) => {
        calls.push(n);
        return n;
      })
      .enumerate()
      [Symbol.asyncIterator]();

    expect(await cursor.next()).toEqual({ done: false, value: [0, 1] });
    expect(calls).toEqual([1]);
    expect(await cursor.next()).toEqual({ done: false, value: [1, 2] });
    expect(calls).toEqual([1, 2]);
  });

  it("starts numbering from zero on the next read", async () => {
    const iter = intoIter(replayable(["a", "b"])).enumerate();

    expect(await read(iter)).toEqual([
      [0, "a"],
      [1, "b"],
    ]);
    expect(await read(iter)).toEqual([
      [0, "a"],
      [1, "b"],
    ]);
  });

  it("does not change the original iterator", async () => {
    const source = intoIter(replayable(["a", "b"]));

    expect(await read(source.enumerate())).toEqual([
      [0, "a"],
      [1, "b"],
    ]);
    expect(await read(source)).toEqual(["a", "b"]);
  });

  it("keeps two enumerated views independent", async () => {
    const source = intoIter(replayable(["a", "b", "c"]));
    const first = source.enumerate()[Symbol.asyncIterator]();
    const second = source.enumerate()[Symbol.asyncIterator]();

    expect(await first.next()).toEqual({ done: false, value: [0, "a"] });
    expect(await first.next()).toEqual({ done: false, value: [1, "b"] });
    expect(await second.next()).toEqual({ done: false, value: [0, "a"] });
  });

  it("starts again after filter", async () => {
    expect(
      await read(
        intoIter(replayable([1, 2, 3, 4]))
          .filter((n) => n % 2 === 0)
          .enumerate(),
      ),
    ).toEqual([
      [0, 2],
      [1, 4],
    ]);
  });

  it("keeps the original indexes when enumerated values are filtered", async () => {
    expect(
      await read(
        intoIter(replayable(["a", "b", "c", "d"]))
          .enumerate()
          .filter(([, value]) => value === "b" || value === "d"),
      ),
    ).toEqual([
      [1, "b"],
      [3, "d"],
    ]);
  });

  it("forwards remaining and decreases it while reading", async () => {
    const source = {
      [Symbol.asyncIterator]() {
        const cursor = {
          left: 3,
          index: 0,
          values: ["a", "b", "c"],
          async next(): Promise<IteratorResult<string>> {
            if (this.index >= this.values.length) return { done: true, value: undefined };
            this.left -= 1;
            return { done: false, value: this.values[this.index++] as string };
          },
          remaining() {
            return this.left;
          },
        };
        return cursor;
      },
    };
    const cursor = intoIter(source).enumerate()[Symbol.asyncIterator]();

    expect(cursor.remaining?.()).toBe(3);
    expect(await cursor.next()).toEqual({ done: false, value: [0, "a"] });
    expect(cursor.remaining?.()).toBe(2);
  });

  it("drops remaining after filter", () => {
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
        .filter(() => true)
        .enumerate()
        [Symbol.asyncIterator]().remaining,
    ).toBeUndefined();
  });

  it("reads a generator only once", async () => {
    async function* once() {
      yield "a";
      yield "b";
    }

    const iter = intoIter(once()).enumerate();

    expect(await read(iter)).toEqual([
      [0, "a"],
      [1, "b"],
    ]);
    expect(await read(iter)).toEqual([]);
  });
});
