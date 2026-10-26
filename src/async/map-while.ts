import { AsyncCursor, AsyncIntoIter, createAsyncCursor } from "../async-into-iter.js";

declare module "../async-into-iter.js" {
  interface AsyncIntoIter<T> {
    mapWhile<R>(fn: (value: T) => PromiseLike<R | null | undefined> | R | null | undefined): AsyncIntoIter<R>;
  }
}

const mapWhileCursor = <T, R>(
  inner: AsyncCursor<T>,
  fn: (value: T) => PromiseLike<R | null | undefined> | R | null | undefined,
): AsyncCursor<R> => {
  let stopped = false;

  return createAsyncCursor({
    next: async () => {
      if (stopped) return { done: true, value: undefined };
      const next = await inner.next();
      if (next.done) return next;
      const nextValue = await fn(next.value);
      if (nextValue == null) {
        stopped = true;
        return { done: true, value: undefined };
      }
      return { done: false, value: nextValue };
    },
    remaining: undefined,
  });
};

AsyncIntoIter.prototype.mapWhile = function mapWhile<T, R>(
  this: AsyncIntoIter<T>,
  fn: (value: T) => PromiseLike<R | null | undefined> | R | null | undefined,
): AsyncIntoIter<R> {
  return AsyncIntoIter.fromCursor(() => mapWhileCursor(this[Symbol.asyncIterator](), fn));
};
