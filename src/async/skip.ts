import { AsyncCursor, AsyncIntoIter, createAsyncCursor } from "../async-into-iter.js";
import { bound, isNotRangeNumber } from "../utils.js";

declare module "../async-into-iter.js" {
  interface AsyncIntoIter<T> {
    skip(count: number): AsyncIntoIter<T>;
  }
}

const skipCursor = <T>(inner: AsyncCursor<T>, count: number): AsyncCursor<T> => {
  let left = count;
  const remaining = bound(inner, inner.remaining);

  return createAsyncCursor({
    next: async () => {
      while (left > 0) {
        left -= 1;
        const { done } = await inner.next();
        if (done) {
          left = 0;
          break;
        }
      }
      return inner.next();
    },
    remaining: remaining && (() => Math.max(0, remaining() - left)),
  });
};

AsyncIntoIter.prototype.skip = function skip<T>(this: AsyncIntoIter<T>, count: number): AsyncIntoIter<T> {
  if (isNotRangeNumber(count)) {
    throw new TypeError("Skip must be a non-negative integer");
  }
  return AsyncIntoIter.fromCursor(() => skipCursor(this[Symbol.asyncIterator](), count));
};
