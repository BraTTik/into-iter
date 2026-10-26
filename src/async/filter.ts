import { AsyncCursor, AsyncIntoIter, createAsyncCursor } from "../async-into-iter.js";

declare module "../async-into-iter.js" {
  interface AsyncIntoIter<T> {
    filter(predicate: (value: T) => PromiseLike<boolean> | boolean): AsyncIntoIter<T>;
  }
}

const filterCursor = <T>(
  inner: AsyncCursor<T>,
  predicate: (value: T) => PromiseLike<boolean> | boolean,
): AsyncCursor<T> => {
  return createAsyncCursor({
    next: async () => {
      for (let item = await inner.next(); !item.done; item = await inner.next()) {
        if (await predicate(item.value)) return item;
      }
      return { done: true, value: undefined };
    },
    remaining: undefined,
  });
};

AsyncIntoIter.prototype.filter = function filter<T>(
  this: AsyncIntoIter<T>,
  predicate: (value: T) => PromiseLike<boolean> | boolean,
): AsyncIntoIter<T> {
  return AsyncIntoIter.fromCursor(() => filterCursor(this[Symbol.asyncIterator](), predicate));
};
