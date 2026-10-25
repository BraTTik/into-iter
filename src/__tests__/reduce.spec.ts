import { describe, it, expect } from "@jest/globals";
import "../filter.js";
import "../map.js";
import "../reduce.js";
import { intoIter } from "../into-iter-factory.js";

describe("IntoIter reduce", () => {
  it("returns undefined for an empty sequence and does not call fn", () => {
    const calls: number[] = [];

    expect(
      intoIter<number>([]).reduce((acc, n) => {
        calls.push(n);
        return acc + n;
      }),
    ).toBeUndefined();
    expect(calls).toEqual([]);
  });

  it("returns the only element without calling fn", () => {
    let calls = 0;

    expect(
      intoIter([7]).reduce((acc, n) => {
        calls += 1;
        return acc + n;
      }),
    ).toBe(7);
    expect(calls).toBe(0);
  });

  it("folds from the left", () => {
    expect(intoIter([1, 2, 3, 4]).reduce((acc, n) => acc - n)).toBe(-8);
    expect(intoIter(["a", "b", "c"]).reduce((acc, s) => acc + s)).toBe("abc");
    expect(intoIter([1n, 2n, 3n]).reduce((acc, n) => acc + n)).toBe(6n);
  });

  it("passes the accumulator and the next element", () => {
    const calls: [number, number][] = [];

    const total = intoIter([1, 2, 3, 4]).reduce((acc, n) => {
      calls.push([acc, n]);
      return acc + n;
    });

    expect(calls).toEqual([
      [1, 2],
      [3, 3],
      [6, 4],
    ]);
    expect(total).toBe(10);
  });

  it("folds a reversed chain from the back", () => {
    expect(intoIter([1, 2, 3, 4]).reversed.reduce((acc, n) => acc - n)).toBe(-2);
  });

  it("reduces the values kept by filter", () => {
    expect(
      intoIter([1, 2, 3, 4])
        .filter((n) => n % 2 === 0)
        .reduce((acc, n) => acc + n),
    ).toBe(6);
  });

  it("does not read the source until reduce runs", () => {
    const calls: number[] = [];
    const values = intoIter([1, 2, 3]).map((n) => {
      calls.push(n);
      return n * 10;
    });

    expect(calls).toEqual([]);
    expect(values.reduce((acc, n) => acc + n)).toBe(60);
    expect(calls).toEqual([1, 2, 3]);
  });

  it("leaves the source readable", () => {
    const source = intoIter([1, 2, 3]);

    expect(source.reduce((acc, n) => acc + n)).toBe(6);
    expect(source.reduce((acc, n) => acc + n)).toBe(6);
    expect([...source]).toEqual([1, 2, 3]);
  });
});
