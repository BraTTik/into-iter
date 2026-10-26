import { AsyncCursor, AsyncIntoIter, createAsyncCursor } from "../async-into-iter.js";
import { bound, isNotRangeNumber } from "../utils.js";

declare module "../async-into-iter.js" {
  interface AsyncIntoIter<T> {
    limit(count: number): AsyncIntoIter<T>;
  }
}

const limitCursor = <T>(inner: AsyncCursor<T>, count: number): AsyncCursor<T> => {
  let left = count;
  const remaining = bound(inner, inner.remaining);

  return createAsyncCursor({
    next: async () => {
      if (left <= 0) return { done: true, value: undefined };
      left -= 1;
      return inner.next();
    },
    remaining: remaining && (() => Math.max(0, Math.min(left, remaining()))),
  });
};

AsyncIntoIter.prototype.limit = function limit<T>(this: AsyncIntoIter<T>, count: number): AsyncIntoIter<T> {
  if (isNotRangeNumber(count)) {
    throw new TypeError("Limit must be a positive integer");
  }
  return AsyncIntoIter.fromCursor(() => limitCursor(this[Symbol.asyncIterator](), count));
};
