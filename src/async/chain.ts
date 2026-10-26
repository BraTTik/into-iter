import { AsyncCursor, AsyncIntoIter, createAsyncCursor, isAsyncIterable } from "../async-into-iter.js";
import { IntoIter } from "../into-iter.js";
import { bound } from "../utils.js";

type Chainable<T> = Iterable<T> | AsyncIterable<T>;

declare module "../async-into-iter.js" {
  interface AsyncIntoIter<T> {
    chain(iterable: Chainable<T>): AsyncIntoIter<T>;
  }
}

const openSide = <T>(source: Chainable<T>): AsyncCursor<T> => {
  if (isAsyncIterable<T>(source)) {
    return AsyncIntoIter.fromAsyncIterable(source)[Symbol.asyncIterator]();
  }

  const cursor = IntoIter.fromIterable(source)[Symbol.iterator]();
  return createAsyncCursor({
    next: async () => cursor.next(),
    remaining: bound(cursor, cursor.remaining),
  });
};

const chainCursor = <T>(inner: AsyncCursor<T>, other: AsyncCursor<T>): AsyncCursor<T> => {
  const remaining = bound(inner, inner.remaining);
  const otherRemaining = bound(other, other.remaining);

  return createAsyncCursor({
    next: async () => {
      const next = await inner.next();
      if (!next.done) return next;
      return other.next();
    },
    remaining: remaining && otherRemaining && (() => remaining() + otherRemaining()),
  });
};

AsyncIntoIter.prototype.chain = function chain<T>(this: AsyncIntoIter<T>, iterable: Chainable<T>): AsyncIntoIter<T> {
  return AsyncIntoIter.fromCursor(() => chainCursor(this[Symbol.asyncIterator](), openSide(iterable)));
};
