import { describe, expect, it } from "@jest/globals";
import { intoIter } from "../../into-iter-factory.js";
import "../../async/map.js";
import "../../async/nth.js";

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

describe("AsyncIntoIter nth", () => {
  describe("nth and first", () => {
    it("returns the element at the index", async () => {
      expect(await intoIter(replayable([1, 2, 3, 4])).nth(0)).toBe(1);
      expect(await intoIter(replayable([1, 2, 3, 4])).nth(2)).toBe(3);
      expect(await intoIter(replayable([1, 2, 3, 4])).first()).toBe(1);
      expect(await intoIter(replayable([0, 1])).first()).toBe(0);
    });

    it("returns undefined when the index is past the end", async () => {
      expect(await intoIter(replayable([1, 2])).nth(5)).toBeUndefined();
      expect(await intoIter(replayable<number>([])).nth(0)).toBeUndefined();
      expect(await intoIter(replayable<number>([])).first()).toBeUndefined();
    });

    it("reads only the elements up to the index", async () => {
      let pulls = 0;
      async function* values(): AsyncGenerator<number> {
        for (let n = 0; n < 10; n += 1) {
          pulls += 1;
          yield n;
        }
      }

      expect(await intoIter(values()).nth(2)).toBe(2);
      expect(pulls).toBe(3);
    });

    it("throws TypeError for an invalid index before reading", () => {
      let pulls = 0;
      async function* values() {
        pulls += 1;
        yield 1;
      }
      const source = intoIter(values());
      const message = "Nth must be a non-negative integer";

      expect(() => source.nth(-1)).toThrow(message);
      expect(() => source.nth(1.5)).toThrow(message);
      expect(() => source.nth(Number.NaN)).toThrow(message);
      expect(pulls).toBe(0);
    });
  });

  describe("last", () => {
    it("returns the last element after reading the whole source", async () => {
      const calls: number[] = [];

      expect(
        await intoIter(replayable([1, 2, 3]))
          .map((n) => {
            calls.push(n);
            return n;
          })
          .last(),
      ).toBe(3);
      expect(calls).toEqual([1, 2, 3]);
      expect(await intoIter(replayable([1, 0])).last()).toBe(0);
    });

    it("returns undefined for an empty source", async () => {
      expect(await intoIter(replayable<number>([])).last()).toBeUndefined();
    });

    it("reads a generator through to the end", async () => {
      let pulls = 0;
      async function* values(): AsyncGenerator<number> {
        for (const n of [1, 2, 3, 4, 5]) {
          pulls += 1;
          yield n;
        }
      }

      expect(await intoIter(values()).last()).toBe(5);
      expect(pulls).toBe(5);
    });
  });

  it("leaves a replayable source readable and continues a generator after nth", async () => {
    const source = intoIter(replayable([1, 2, 3, 4]));

    expect(await source.first()).toBe(1);
    expect(await source.last()).toBe(4);
    expect(await source.nth(2)).toBe(3);

    async function* once(): AsyncGenerator<number> {
      yield 1;
      yield 2;
      yield 3;
    }

    const generated = intoIter(once());

    expect(await generated.first()).toBe(1);
    expect(await generated.nth(0)).toBe(2);
  });
});
