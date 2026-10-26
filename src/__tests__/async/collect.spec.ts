import { describe, expect, it } from "@jest/globals";
import { intoIter } from "../../into-iter-factory.js";
import { collector as publicCollector, type Collector } from "../../collect.js";
import { collector } from "../../collector.js";
import "../../async/collect.js";
import "../../async/map.js";

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

describe("AsyncIntoIter collect", () => {
  it("uses the same collector symbol as the synchronous import", () => {
    expect(collector).toBe(publicCollector);
  });

  it("fills an array and returns the same instance", async () => {
    const target: number[] = [0];

    expect(await intoIter(replayable([1, 2])).collect(target)).toBe(target);
    expect(target).toEqual([0, 1, 2]);
  });

  it("fills a Set and returns the same instance", async () => {
    const target = new Set([0]);

    expect(await intoIter(replayable([1, 2, 2])).collect(target)).toBe(target);
    expect([...target]).toEqual([0, 1, 2]);
  });

  it("fills a Map from pairs and overwrites an existing key", async () => {
    const target = new Map<string, number>([["a", 0]]);
    const pairs: [string, number][] = [
      ["a", 1],
      ["b", 2],
    ];

    expect(await intoIter(replayable(pairs)).collect(target)).toBe(target);
    expect([...target]).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
  });

  it("builds an array, a Set, and a Map", async () => {
    const pairs: [string, number][] = [
      ["a", 1],
      ["b", 2],
    ];

    expect(await intoIter(replayable([1, 2, 3])).toArray()).toEqual([1, 2, 3]);
    expect(await intoIter(replayable([1, 2, 2, 3])).toSet()).toEqual(new Set([1, 2, 3]));
    expect(await intoIter(replayable(pairs)).toMap()).toEqual(new Map(pairs));
  });

  it("builds an empty collection from an empty source", async () => {
    expect(await intoIter(replayable<number>([])).toArray()).toEqual([]);
    expect(await intoIter(replayable<number>([])).toSet()).toEqual(new Set());
    expect(await intoIter(replayable<[string, number]>([])).toMap()).toEqual(new Map());
  });

  it("returns the value from finish and calls it once", async () => {
    const added: number[] = [];
    let finished = 0;
    const target = {
      [publicCollector](): Collector<number, string> {
        return {
          add(value) {
            added.push(value);
          },
          finish() {
            finished += 1;
            return added.join(",");
          },
        };
      },
    };

    expect(await intoIter(replayable([1, 2, 3])).collect(target)).toBe("1,2,3");
    expect(added).toEqual([1, 2, 3]);
    expect(finished).toBe(1);
  });

  it("calls finish for an empty source and does not call add", async () => {
    let finished = 0;
    const target = {
      [collector](): Collector<number, string> {
        return {
          add() {
            throw new Error("empty source has no elements");
          },
          finish() {
            finished += 1;
            return "empty";
          },
        };
      },
    };

    expect(await intoIter(replayable<number>([])).collect(target)).toBe("empty");
    expect(finished).toBe(1);
  });

  it("does not read the source until collect runs", async () => {
    const calls: number[] = [];
    const values = intoIter(replayable([1, 2, 3])).map((n) => {
      calls.push(n);
      return n * 10;
    });

    expect(calls).toEqual([]);
    expect(await values.collect([])).toEqual([10, 20, 30]);
    expect(calls).toEqual([1, 2, 3]);
  });

  it("leaves a replayable source readable and exhausts a generator", async () => {
    const source = intoIter(replayable([1, 2, 3]));

    expect(await source.toArray()).toEqual([1, 2, 3]);
    expect(await source.toArray()).toEqual([1, 2, 3]);

    async function* once() {
      yield 1;
      yield 2;
    }

    const generated = intoIter(once());

    expect(await generated.toArray()).toEqual([1, 2]);
    expect(await generated.toArray()).toEqual([]);
  });
});
