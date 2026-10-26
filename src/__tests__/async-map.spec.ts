import { describe, expect, it } from "@jest/globals";
import "../async/map.js";
import { intoIter } from "../into-iter-factory.js";

const read = async <T>(source: AsyncIterable<T>): Promise<T[]> => {
  const values: T[] = [];
  for await (const value of source) values.push(value);
  return values;
};

const replayable = <T>(values: readonly T[]): AsyncIterable<T> => ({
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

describe("AsyncIntoIter map", () => {
  describe("forward", () => {
    it("maps each value", async () => {
      expect(await read(intoIter(replayable([1, 2, 3])).map((n) => n * 10))).toEqual([10, 20, 30]);
    });

    it("awaits a promise returned by the mapper", async () => {
      expect(await read(intoIter(replayable([1, 2, 3])).map(async (n) => n * 10))).toEqual([10, 20, 30]);
    });

    it("awaits a thenable returned by the mapper", async () => {
      const thenable = (value: number): PromiseLike<number> => ({
        then(onfulfilled, onrejected) {
          return Promise.resolve(value).then(onfulfilled, onrejected);
        },
      });

      expect(await read(intoIter(replayable([1, 2])).map((n) => thenable(n * 10)))).toEqual([10, 20]);
    });

    it("keeps falsy values", async () => {
      expect(await read(intoIter(replayable([0, false, ""])).map((value) => value))).toEqual([0, false, ""]);
    });

    it("yields nothing for an empty source", async () => {
      expect(await read(intoIter(replayable<number>([])).map((n) => n * 10))).toEqual([]);
    });

    it("stays done after exhaustion and does not call the mapper again", async () => {
      const calls: number[] = [];
      const cursor = intoIter(replayable([1]))
        .map((n) => {
          calls.push(n);
          return n * 10;
        })
        [Symbol.asyncIterator]();

      expect(await cursor.next()).toEqual({ done: false, value: 10 });
      expect(await cursor.next()).toEqual({ done: true, value: undefined });
      expect(await cursor.next()).toEqual({ done: true, value: undefined });
      expect(calls).toEqual([1]);
    });

    it("drops the source completion value", async () => {
      const calls: number[] = [];
      const source = {
        [Symbol.asyncIterator]() {
          let finished = false;
          return {
            async next(): Promise<IteratorResult<number>> {
              if (finished) return { done: true, value: 99 };
              finished = true;
              return { done: false, value: 1 };
            },
          };
        },
      };

      const cursor = intoIter(source)
        .map((n) => {
          calls.push(n);
          return n * 10;
        })
        [Symbol.asyncIterator]();

      expect(await cursor.next()).toEqual({ done: false, value: 10 });
      expect(await cursor.next()).toEqual({ done: true, value: undefined });
      expect(calls).toEqual([1]);
    });
  });

  describe("laziness", () => {
    it("does not open the source or call the mapper until iteration starts", async () => {
      let opened = 0;
      const calls: number[] = [];
      const source = {
        [Symbol.asyncIterator]() {
          opened += 1;
          return (async function* () {
            yield 1;
          })();
        },
      };

      const iter = intoIter(source).map((n) => {
        calls.push(n);
        return n * 10;
      });

      expect(opened).toBe(0);
      expect(calls).toEqual([]);
      expect(await read(iter)).toEqual([10]);
      expect(opened).toBe(1);
      expect(calls).toEqual([1]);
    });

    it("calls the mapper only for consumed elements", async () => {
      const calls: number[] = [];
      const cursor = intoIter(replayable([1, 2, 3, 4]))
        .map((n) => {
          calls.push(n);
          return n * 10;
        })
        [Symbol.asyncIterator]();

      expect((await cursor.next()).value).toBe(10);
      expect(calls).toEqual([1]);
      expect((await cursor.next()).value).toBe(20);
      expect(calls).toEqual([1, 2]);
    });
  });

  describe("view semantics", () => {
    it("reads a replayable source again from the start and calls the mapper again", async () => {
      const calls: number[] = [];
      const iter = intoIter(replayable([1, 2, 3])).map((n) => {
        calls.push(n);
        return n * 2;
      });

      expect(await read(iter)).toEqual([2, 4, 6]);
      expect(calls).toEqual([1, 2, 3]);
      expect(await read(iter)).toEqual([2, 4, 6]);
      expect(calls).toEqual([1, 2, 3, 1, 2, 3]);
    });

    it("reads an async generator only once", async () => {
      const calls: number[] = [];
      async function* once() {
        yield 1;
        yield 2;
      }

      const iter = intoIter(once()).map((n) => {
        calls.push(n);
        return n * 10;
      });

      expect(await read(iter)).toEqual([10, 20]);
      expect(calls).toEqual([1, 2]);
      expect(await read(iter)).toEqual([]);
      expect(calls).toEqual([1, 2]);
    });

    it("replays a chain of maps and calls each mapper again", async () => {
      const calls: number[] = [];
      const iter = intoIter(replayable([0, 1, 2]))
        .map((n) => {
          calls.push(n);
          return n + 2;
        })
        .map(async (n) => n + 2);

      expect(await read(iter)).toEqual([4, 5, 6]);
      expect(calls).toEqual([0, 1, 2]);
      expect(await read(iter)).toEqual([4, 5, 6]);
      expect(calls).toEqual([0, 1, 2, 0, 1, 2]);
    });

    it("keeps a second map independent after the first is consumed", async () => {
      const source = intoIter(replayable([1, 2, 3]));
      const first = source.map((n) => n + 2);

      expect(await read(first)).toEqual([3, 4, 5]);

      const second = source.map((n) => n + 2);

      expect(await read(second)).toEqual([3, 4, 5]);
      expect(await read(first)).toEqual([3, 4, 5]);
    });

    it("does not change the original iterator", async () => {
      const source = intoIter(replayable([1, 2, 3]));

      expect(await read(source.map((n) => n * 10))).toEqual([10, 20, 30]);
      expect(await read(source)).toEqual([1, 2, 3]);
    });
  });

  describe("remaining", () => {
    it("forwards remaining and decreases it as values are read", async () => {
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
        .map((n) => n * 10)
        [Symbol.asyncIterator]();

      expect(cursor.remaining?.()).toBe(2);
      expect(await cursor.next()).toEqual({ done: false, value: 10 });
      expect(cursor.remaining?.()).toBe(1);
    });

    it("has no remaining when the source has none", () => {
      expect(
        intoIter(replayable([1, 2]))
          .map((n) => n)
          [Symbol.asyncIterator]().remaining,
      ).toBeUndefined();
    });
  });
});
