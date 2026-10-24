import type { DoubleEndedCursor } from "./double-ended-cursor.ts";

export type RangeOptions = {
  start: number;
  end: number;
  step: number;
};

const rangeOptionKeys: Set<keyof RangeOptions> = new Set(["start", "end", "step"]);

export function isRangeOptions(value: unknown): value is RangeOptions {
  if (typeof value === "object" && value !== null) {
    const entries = Object.keys(value);
    return (
      entries.length >= 3 &&
      rangeOptionKeys
        .values()
        .every((key) => Object.hasOwn(value, key) && typeof (value as RangeOptions)[key] === "number")
    );
  }
  return false;
}

const createRangeOptions = (end: number): RangeOptions => ({ start: 0, end, step: 1 });

const rangedDoubleEndedCursor = (options: RangeOptions): DoubleEndedCursor<number> => {
  const { start, end, step } = options;
  const count = start < end ? Math.floor((end - 1 - start) / step) + 1 : 0;
  let front = 0;
  let back = count;

  const withDone = (callback: () => IteratorResult<number>) => (): IteratorResult<number> => {
    if (front >= back) return { done: true, value: undefined };
    return callback();
  };

  return {
    next: withDone(() => ({ done: false, value: start + front++ * step })),
    nextBack: withDone(() => ({ done: false, value: start + --back * step })),
    remaining: () => back - front,
    [Symbol.iterator]() {
      return this;
    },
  };
};

export function rangeIterator(end: number): DoubleEndedCursor<number>;
export function rangeIterator(options: RangeOptions): DoubleEndedCursor<number>;
export function rangeIterator(rangeOrOptions: number | RangeOptions): DoubleEndedCursor<number> {
  let options: RangeOptions;
  if (typeof rangeOrOptions === "number") {
    if (isNaN(rangeOrOptions)) {
      throw new TypeError("Range options must be a number got NaN instead");
    }
    options = createRangeOptions(rangeOrOptions);
  } else {
    options = rangeOrOptions;
  }

  return rangedDoubleEndedCursor(options);
}
