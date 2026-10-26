import { describe, expect, it } from "@jest/globals";
import { intoIter } from "../../into-iter-factory.js";
import "../../async/filter.js";
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

const counted = (length: number) => ({
  [Symbol.asyncIterator]() {
    const cursor = {
      index: 0,
      async next(): Promise<IteratorResult<number>> {
        if (this.index >= length) return { done: true, value: undefined };
        return { done: false, value: this.index++ };
      },
      remaining() {
        return length - this.index;
      },
    };
    return cursor;
  },
});

const skipError = new TypeError("Skip must be a non-negative integer");

describe("AsyncIntoIter skip", () => {
  it("drops the first elements", async () => {
    expect(await read(intoIter(replayable([1, 2, 3, 4])).skip(2))).toEqual([3, 4]);
  });

  it("yields the whole source when the count is zero", async () => {
    expect(await read(intoIter(replayable([1, 2, 3])).skip(0))).toEqual([1, 2, 3]);
  });

  it("yields nothing when the count covers the source", async () => {
    expect(await read(intoIter(replayable([1, 2, 3])).skip(3))).toEqual([]);
    expect(await read(intoIter(replayable([1, 2, 3])).skip(10))).toEqual([]);
    expect(await read(intoIter(replayable<number>([])).skip(3))).toEqual([]);
  });

  it("adds chained skips", async () => {
    expect(
      await read(
        intoIter(replayable([0, 1, 2, 3, 4, 5]))
          .skip(2)
          .skip(3),
      ),
    ).toEqual([5]);
    expect(
      await read(
        intoIter(replayable([0, 1, 2, 3, 4, 5]))
          .skip(3)
          .skip(2),
      ),
    ).toEqual([5]);
  });

  it("throws TypeError for a negative, fractional, or NaN count before reading", () => {
    let started = false;
    async function* values() {
      started = true;
      yield 1;
    }

    expect(() => intoIter(values()).skip(-1)).toThrow(skipError);
    expect(() => intoIter(values()).skip(2.5)).toThrow(skipError);
    expect(() => intoIter(values()).skip(Number.NaN)).toThrow(skipError);
    expect(started).toBe(false);
  });

  it("stays done after exhaustion", async () => {
    const cursor = intoIter(replayable([1, 2, 3]))
      .skip(2)
      [Symbol.asyncIterator]();

    expect(await cursor.next()).toEqual({ done: false, value: 3 });
    expect(await cursor.next()).toEqual({ done: true, value: undefined });
    expect(await cursor.next()).toEqual({ done: true, value: undefined });
  });

  it("stays done when the count is larger than the source", async () => {
    const cursor = intoIter(replayable([1, 2]))
      .skip(5)
      [Symbol.asyncIterator]();

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
      .skip(2);

    expect(calls).toEqual([]);
  });

  it("pulls the skipped elements and the requested one", async () => {
    const calls: number[] = [];
    const cursor = intoIter(replayable([0, 1, 2, 3, 4]))
      .map((n) => {
        calls.push(n);
        return n;
      })
      .skip(3)
      [Symbol.asyncIterator]();

    expect(await cursor.next()).toEqual({ done: false, value: 3 });
    expect(calls).toEqual([0, 1, 2, 3]);
  });

  it("does not pull past a following limit", async () => {
    const calls: number[] = [];
    const iter = intoIter(replayable([0, 1, 2, 3, 4, 5]))
      .map((n) => {
        calls.push(n);
        return n;
      })
      .skip(3)
      .limit(2);

    expect(await read(iter)).toEqual([3, 4]);
    expect(calls).toEqual([0, 1, 2, 3, 4]);
  });

  it("stops an infinite generator when limit follows skip", async () => {
    let yielded = 0;
    async function* naturals() {
      for (let n = 0; ; n++) {
        yielded += 1;
        yield n;
      }
    }

    expect(await read(intoIter(naturals()).skip(2).limit(3))).toEqual([2, 3, 4]);
    expect(yielded).toBe(5);
  });

  it("counts skipped matches after filter", async () => {
    const calls: number[] = [];
    const cursor = intoIter(replayable([0, 1, 2, 3, 4, 5, 6]))
      .filter((n) => {
        calls.push(n);
        return n % 3 === 0;
      })
      .skip(2)
      [Symbol.asyncIterator]();

    expect(await cursor.next()).toEqual({ done: false, value: 6 });
    expect(calls).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("reads the skipped view again from the start", async () => {
    const iter = intoIter(replayable([1, 2, 3, 4])).skip(2);

    expect(await read(iter)).toEqual([3, 4]);
    expect(await read(iter)).toEqual([3, 4]);
  });

  it("does not change the original iterator", async () => {
    const source = intoIter(replayable([0, 1, 2, 3, 4]));

    expect(await read(source.skip(2))).toEqual([2, 3, 4]);
    expect(await read(source)).toEqual([0, 1, 2, 3, 4]);
  });

  it("keeps two skipped views independent", async () => {
    const source = intoIter(replayable([0, 1, 2, 3, 4, 5]));
    const first = source.skip(2)[Symbol.asyncIterator]();
    const second = source.skip(4)[Symbol.asyncIterator]();

    expect(await first.next()).toEqual({ done: false, value: 2 });
    expect(await second.next()).toEqual({ done: false, value: 4 });
    expect(await first.next()).toEqual({ done: false, value: 3 });
  });

  it("exhausts a generator when the tail is fully read", async () => {
    async function* once() {
      yield 1;
      yield 2;
      yield 3;
      yield 4;
    }

    const iter = intoIter(once()).skip(2);

    expect(await read(iter)).toEqual([3, 4]);
    expect(await read(iter)).toEqual([]);
  });

  it("applies skip again to the remainder of a generator", async () => {
    async function* once() {
      yield 1;
      yield 2;
      yield 3;
      yield 4;
      yield 5;
    }

    const iter = intoIter(once()).skip(1).limit(2);

    expect(await read(iter)).toEqual([2, 3]);
    expect(await read(iter)).toEqual([5]);
    expect(await read(iter)).toEqual([]);
  });

  it("reports the length minus the skipped count before reading", () => {
    expect(intoIter(counted(10)).skip(3)[Symbol.asyncIterator]().remaining?.()).toBe(7);
    expect(intoIter(counted(10)).skip(0)[Symbol.asyncIterator]().remaining?.()).toBe(10);
    expect(intoIter(counted(3)).skip(10)[Symbol.asyncIterator]().remaining?.()).toBe(0);
    expect(intoIter(counted(10)).skip(2).skip(3)[Symbol.asyncIterator]().remaining?.()).toBe(5);
  });

  it("decreases remaining while reading", async () => {
    const cursor = intoIter(counted(10)).skip(3)[Symbol.asyncIterator]();

    expect(cursor.remaining?.()).toBe(7);
    await cursor.next();
    expect(cursor.remaining?.()).toBe(6);
  });

  it("keeps remaining through map and drops it after filter", () => {
    expect(
      intoIter(counted(10))
        .map((n) => n * 2)
        .skip(3)
        [Symbol.asyncIterator]()
        .remaining?.(),
    ).toBe(7);
    expect(
      intoIter(counted(10))
        .filter(() => true)
        .skip(3)
        [Symbol.asyncIterator]().remaining,
    ).toBeUndefined();
  });

  it("has no remaining when the source length is unknown", () => {
    expect(
      intoIter(replayable([1, 2, 3]))
        .skip(1)
        [Symbol.asyncIterator]().remaining,
    ).toBeUndefined();
  });
});
