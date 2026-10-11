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

export function rangeIterator(end: number): IteratorObject<number>;
export function rangeIterator(options: RangeOptions): IteratorObject<number>;
export function rangeIterator(rangeOrOptions: number | RangeOptions): IteratorObject<number> {
  let options: RangeOptions;
  if (typeof rangeOrOptions === "number") {
    if (isNaN(rangeOrOptions)) {
      throw new TypeError("Range options must be a number got NaN instead");
    }
    options = createRangeOptions(rangeOrOptions);
  } else {
    options = rangeOrOptions;
  }

  let current = options.start;

  return Iterator.from({
    next: () => {
      if (current < options.end) {
        const value = current;
        current += options.step;
        return { done: false, value };
      }

      return { done: true, value: undefined };
    },
  }) as IteratorObject<number>;
}
