import { AsyncCursor, AsyncIntoIter, createAsyncCursor } from "../async-into-iter.js";

declare module "../async-into-iter.js" {
  interface AsyncIntoIter<T> {
    skipWhile(predicate: (value: T) => PromiseLike<boolean> | boolean): AsyncIntoIter<T>;
  }
}

const skipWhileCursor = <T>(
  inner: AsyncCursor<T>,
  predicate: (value: T) => PromiseLike<boolean> | boolean,
): AsyncCursor<T> => {
  let skipped = false;

  return createAsyncCursor({
    next: async () => {
      let item = await inner.next();
      while (!skipped) {
        if (item.done) {
          skipped = true;
          break;
        }
        if (await predicate(item.value)) {
          item = await inner.next();
          continue;
        }
        skipped = true;
        break;
      }
      return item;
    },
    remaining: undefined,
  });
};

AsyncIntoIter.prototype.skipWhile = function skipWhile<T>(
  this: AsyncIntoIter<T>,
  predicate: (value: T) => PromiseLike<boolean> | boolean,
): AsyncIntoIter<T> {
  return AsyncIntoIter.fromCursor(() => skipWhileCursor(this[Symbol.asyncIterator](), predicate));
};
