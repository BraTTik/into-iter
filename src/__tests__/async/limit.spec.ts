import { describe, expect, it } from "@jest/globals";
import { intoIter } from "../../into-iter-factory.js";
import "../../async/filter.js";
import "../../async/limit.js";
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

describe("AsyncIntoIter limit", () => {
  it("takes the first elements", async () => {
    expect(await read(intoIter(replayable([1, 2, 3, 4])).limit(2))).toEqual([1, 2]);
  });

  it("yields the whole source when the limit is larger or equal", async () => {
    expect(await read(intoIter(replayable([1, 2, 3])).limit(10))).toEqual([1, 2, 3]);
    expect(await read(intoIter(replayable([1, 2, 3])).limit(3))).toEqual([1, 2, 3]);
  });

  it("yields nothing for a zero limit", async () => {
    const calls: number[] = [];
    const iter = intoIter(replayable([1, 2, 3]))
      .map((n) => {
        calls.push(n);
        return n;
      })
      .limit(0);

    expect(await read(iter)).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("yields nothing for an empty source", async () => {
    expect(await read(intoIter(replayable<number>([])).limit(3))).toEqual([]);
  });

  it("throws TypeError for a negative, fractional, or NaN limit before reading", () => {
    let started = false;
    async function* values() {
      started = true;
      yield 1;
    }

    const message = new TypeError("Limit must be a positive integer");
    expect(() => intoIter(values()).limit(-1)).toThrow(message);
    expect(() => intoIter(values()).limit(1.5)).toThrow(message);
    expect(() => intoIter(values()).limit(Number.NaN)).toThrow(message);
    expect(started).toBe(false);
  });

  it("applies the smallest of chained limits", async () => {
    expect(
      await read(
        intoIter(replayable([0, 1, 2, 3, 4]))
          .limit(5)
          .limit(2),
      ),
    ).toEqual([0, 1]);
    expect(
      await read(
        intoIter(replayable([0, 1, 2, 3, 4]))
          .limit(2)
          .limit(5),
      ),
    ).toEqual([0, 1]);
  });

  it("stays done after exhaustion", async () => {
    const cursor = intoIter(replayable([1, 2, 3]))
      .limit(1)
      [Symbol.asyncIterator]();

    expect(await cursor.next()).toEqual({ done: false, value: 1 });
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
      .limit(2);

    expect(calls).toEqual([]);
  });

  it("does not pull elements past the limit", async () => {
    const calls: number[] = [];
    const iter = intoIter(replayable([0, 1, 2, 3, 4]))
      .map((n) => {
        calls.push(n);
        return n;
      })
      .limit(3);

    expect(await read(iter)).toEqual([0, 1, 2]);
    expect(calls).toEqual([0, 1, 2]);
  });

  it("stops an infinite generator", async () => {
    let yielded = 0;
    async function* naturals() {
      for (let n = 0; ; n++) {
        yielded += 1;
        yield n;
      }
    }

    expect(await read(intoIter(naturals()).limit(3))).toEqual([0, 1, 2]);
    expect(yielded).toBe(3);
  });

  it("pulls only until the filtered elements are found", async () => {
    const calls: number[] = [];
    const iter = intoIter(replayable([0, 1, 2, 3, 4, 5]))
      .filter((n) => {
        calls.push(n);
        return n % 3 === 0;
      })
      .limit(2);

    expect(await read(iter)).toEqual([0, 3]);
    expect(calls).toEqual([0, 1, 2, 3]);
  });

  it("reads the limited view again from the start", async () => {
    const iter = intoIter(replayable([1, 2, 3, 4])).limit(2);

    expect(await read(iter)).toEqual([1, 2]);
    expect(await read(iter)).toEqual([1, 2]);
  });

  it("does not change the original iterator", async () => {
    const source = intoIter(replayable([0, 1, 2, 3, 4]));

    expect(await read(source.limit(2))).toEqual([0, 1]);
    expect(await read(source)).toEqual([0, 1, 2, 3, 4]);
  });

  it("keeps two limited views independent", async () => {
    const source = intoIter(replayable([0, 1, 2, 3]));
    const first = source.limit(2)[Symbol.asyncIterator]();
    const second = source.limit(3)[Symbol.asyncIterator]();

    expect(await first.next()).toEqual({ done: false, value: 0 });
    expect(await first.next()).toEqual({ done: false, value: 1 });
    expect(await second.next()).toEqual({ done: false, value: 0 });
    expect(await first.next()).toEqual({ done: true, value: undefined });
  });

  it("continues a generator from the element the previous limit did not pull", async () => {
    async function* once() {
      yield 1;
      yield 2;
      yield 3;
    }

    const iter = intoIter(once()).limit(2);

    expect(await read(iter)).toEqual([1, 2]);
    expect(await read(iter)).toEqual([3]);
    expect(await read(iter)).toEqual([]);
  });

  it("reports the smaller of the limit and the source length", () => {
    expect(
      intoIter(counted([1, 2, 3, 4, 5]))
        .limit(3)
        [Symbol.asyncIterator]()
        .remaining?.(),
    ).toBe(3);
    expect(
      intoIter(counted([1, 2, 3]))
        .limit(10)
        [Symbol.asyncIterator]()
        .remaining?.(),
    ).toBe(3);
    expect(
      intoIter(counted([1, 2, 3]))
        .limit(0)
        [Symbol.asyncIterator]()
        .remaining?.(),
    ).toBe(0);
  });

  it("decreases remaining while reading", async () => {
    const cursor = intoIter(counted([0, 1, 2, 3, 4]))
      .limit(4)
      [Symbol.asyncIterator]();

    expect(cursor.remaining?.()).toBe(4);
    await cursor.next();
    expect(cursor.remaining?.()).toBe(3);
  });

  it("keeps remaining through map and drops it after filter", () => {
    expect(
      intoIter(counted([0, 1, 2, 3, 4]))
        .map((n) => n * 2)
        .limit(3)
        [Symbol.asyncIterator]()
        .remaining?.(),
    ).toBe(3);
    expect(
      intoIter(counted([0, 1, 2]))
        .filter(() => true)
        .limit(3)
        [Symbol.asyncIterator]().remaining,
    ).toBeUndefined();
  });

  it("has no remaining when the source length is unknown", () => {
    expect(
      intoIter(replayable([1, 2, 3]))
        .limit(2)
        [Symbol.asyncIterator]().remaining,
    ).toBeUndefined();
  });
});
