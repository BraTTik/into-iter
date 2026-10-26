import { AsyncCursor, AsyncIntoIter, createAsyncCursor } from "../async-into-iter.js";

declare module "../async-into-iter.js" {
  interface AsyncIntoIter<T> {
    takeWhile(predicate: (value: T) => PromiseLike<boolean> | boolean): AsyncIntoIter<T>;
  }
}

const takeWhileCursor = <T>(
  inner: AsyncCursor<T>,
  predicate: (value: T) => PromiseLike<boolean> | boolean,
): AsyncCursor<T> => {
  let stopped = false;

  return createAsyncCursor({
    next: async () => {
      if (stopped) return { done: true, value: undefined };
      const next = await inner.next();
      if (next.done) return next;
      if (await predicate(next.value)) return next;
      stopped = true;
      return { done: true, value: undefined };
    },
    remaining: undefined,
  });
};

AsyncIntoIter.prototype.takeWhile = function takeWhile<T>(
  this: AsyncIntoIter<T>,
  predicate: (value: T) => PromiseLike<boolean> | boolean,
): AsyncIntoIter<T> {
  return AsyncIntoIter.fromCursor(() => takeWhileCursor(this[Symbol.asyncIterator](), predicate));
};
