import { AsyncCursor, AsyncIntoIter, createAsyncCursor } from "../async-into-iter.js";
import { bound } from "../utils.js";

declare module "../async-into-iter.js" {
  interface AsyncIntoIter<T> {
    map<R>(fn: (value: T) => PromiseLike<R> | R): AsyncIntoIter<R>;
  }
}

const mapCursor = <T, R>(inner: AsyncCursor<T>, fn: (value: T) => PromiseLike<R> | R): AsyncCursor<R> => {
  const apply = async (item: Promise<IteratorResult<T>>): Promise<IteratorResult<R>> => {
    const result = await item;
    if (result.done) return { done: true, value: undefined };
    return { done: false, value: await fn(result.value) };
  };

  return createAsyncCursor({
    next: () => apply(inner.next()),
    remaining: bound(inner, inner.remaining),
  });
};

AsyncIntoIter.prototype.map = function map<T, R>(
  this: AsyncIntoIter<T>,
  fn: (value: T) => PromiseLike<R> | R,
): AsyncIntoIter<R> {
  return AsyncIntoIter.fromCursor(() => mapCursor(this[Symbol.asyncIterator](), fn));
};
