import { AsyncCursor, AsyncIntoIter, createAsyncCursor } from "../async-into-iter.js";
import { bound } from "../utils.js";

declare module "../async-into-iter.js" {
  interface AsyncIntoIter<T> {
    enumerate(this: AsyncIntoIter<T>): AsyncIntoIter<[number, T]>;
  }
}

const enumerateCursor = <T>(inner: AsyncCursor<T>): AsyncCursor<[number, T]> => {
  let index = 0;
  const remaining = bound(inner, inner.remaining);

  return createAsyncCursor({
    next: async (): Promise<IteratorResult<[number, T]>> => {
      const item = await inner.next();
      if (item.done) return { done: true, value: undefined };
      const value: T = item.value;
      return { done: false, value: [index++, value] };
    },
    remaining: remaining && (() => remaining()),
  });
};

AsyncIntoIter.prototype.enumerate = function enumerate<T>(this: AsyncIntoIter<T>): AsyncIntoIter<[number, T]> {
  return AsyncIntoIter.fromCursor(() => enumerateCursor(this[Symbol.asyncIterator]()));
};
