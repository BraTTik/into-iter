import { describe, expect, it } from "@jest/globals";
import "../all.js";
import "../async/all.js";
import { intoIter } from "../into-iter-factory.js";

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

describe("into-iter/all", () => {
  it("registers every synchronous method", () => {
    const values = intoIter([1, 2, 3, 4]);

    expect([...values.map((n) => n * 10)]).toEqual([10, 20, 30, 40]);
    expect([...values.enumerate()]).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ]);
    expect([...values.filter((n) => n % 2 === 0)]).toEqual([2, 4]);
    expect([...values.limit(2)]).toEqual([1, 2]);
    expect([...values.skip(2)]).toEqual([3, 4]);
    expect([...values.flatMap((n) => [n])]).toEqual([1, 2, 3, 4]);
    expect(values.toArray()).toEqual([1, 2, 3, 4]);
    expect(values.sum()).toBe(10);
    expect(values.reduce((acc, n) => acc + n)).toBe(10);
    expect(values.fold(0, (acc, n) => acc + n)).toBe(10);
    expect(values.every((n) => n > 0)).toBe(true);
    expect(values.find((n) => n > 2)).toBe(3);
    expect(values.nth(1)).toBe(2);
    expect([...values.takeWhile((n) => n < 3)]).toEqual([1, 2]);
    expect([...values.skipWhile((n) => n < 3)]).toEqual([3, 4]);
    expect([...values.mapWhile((n) => (n < 3 ? n : undefined))]).toEqual([1, 2]);
    expect([...values.chain([5])]).toEqual([1, 2, 3, 4, 5]);
    expect(values.count()).toBe(4);
  });
});

describe("into-iter/async/all", () => {
  it("registers every asynchronous method", async () => {
    const values = () => intoIter(replayable([1, 2, 3, 4]));

    expect(
      await values()
        .map(async (n) => n * 10)
        .toArray(),
    ).toEqual([10, 20, 30, 40]);
    expect(await values().enumerate().toArray()).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ]);
    expect(
      await values()
        .filter(async (n) => n % 2 === 0)
        .toArray(),
    ).toEqual([2, 4]);
    expect(await values().limit(2).toArray()).toEqual([1, 2]);
    expect(await values().skip(2).toArray()).toEqual([3, 4]);
    expect(
      await values()
        .flatMap(async (n) => [n])
        .toArray(),
    ).toEqual([1, 2, 3, 4]);
    expect(await values().toArray()).toEqual([1, 2, 3, 4]);
    expect(await values().sum()).toBe(10);
    expect(await values().reduce(async (acc, n) => acc + n)).toBe(10);
    expect(await values().fold(0, async (acc, n) => acc + n)).toBe(10);
    expect(await values().every(async (n) => n > 0)).toBe(true);
    expect(await values().find(async (n) => n > 2)).toBe(3);
    expect(await values().nth(1)).toBe(2);
    expect(
      await values()
        .takeWhile(async (n) => n < 3)
        .toArray(),
    ).toEqual([1, 2]);
    expect(
      await values()
        .skipWhile(async (n) => n < 3)
        .toArray(),
    ).toEqual([3, 4]);
    expect(
      await values()
        .mapWhile(async (n) => (n < 3 ? n : undefined))
        .toArray(),
    ).toEqual([1, 2]);
    expect(await values().chain([5]).toArray()).toEqual([1, 2, 3, 4, 5]);
    expect(await values().count()).toBe(4);
  });
});
