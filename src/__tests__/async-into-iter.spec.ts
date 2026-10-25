import { describe, expect, it } from "@jest/globals";
import { intoIter } from "../into-iter-factory.js";

const read = async <T>(source: AsyncIterable<T>): Promise<T[]> => {
  const values: T[] = [];
  for await (const value of source) values.push(value);
  return values;
};

describe("AsyncIntoIter", () => {
  it("does not open the source until iteration starts", async () => {
    let opened = 0;
    const source = {
      [Symbol.asyncIterator]() {
        opened += 1;
        return (async function* () {
          yield 1;
        })();
      },
    };

    const iter = intoIter(source);

    expect(opened).toBe(0);
    expect(await read(iter)).toEqual([1]);
    expect(opened).toBe(1);
  });

  it("reads a replayable async iterable again from the start", async () => {
    const source = {
      [Symbol.asyncIterator]() {
        const values = [1, 2, 3];
        let index = 0;
        return {
          async next(): Promise<IteratorResult<number>> {
            if (index >= values.length) return { done: true, value: undefined };
            return { done: false, value: values[index++] as number };
          },
        };
      },
    };

    const iter = intoIter(source);

    expect(await read(iter)).toEqual([1, 2, 3]);
    expect(await read(iter)).toEqual([1, 2, 3]);
  });

  it("reads an async generator only once", async () => {
    async function* once() {
      yield 1;
      yield 2;
    }

    const iter = intoIter(once());

    expect(await read(iter)).toEqual([1, 2]);
    expect(await read(iter)).toEqual([]);
  });

  it("does not run an async generator until iteration starts", async () => {
    let started = false;
    async function* values() {
      started = true;
      yield 1;
    }

    const iter = intoIter(values());

    expect(started).toBe(false);
    expect(await read(iter)).toEqual([1]);
    expect(started).toBe(true);
  });

  it("forwards remaining when the source cursor has it", async () => {
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

    const cursor = intoIter(source)[Symbol.asyncIterator]();

    expect(cursor.remaining?.()).toBe(2);
    expect(await cursor.next()).toEqual({ done: false, value: 1 });
    expect(cursor.remaining?.()).toBe(1);
  });

  it("reads the async side when both symbols exist", async () => {
    const both = {
      *[Symbol.iterator]() {
        yield "sync";
      },
      async *[Symbol.asyncIterator]() {
        yield "async";
      },
    };

    expect(await read(intoIter(both))).toEqual(["async"]);
  });
});
