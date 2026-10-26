import { AsyncCursor, AsyncIntoIter, createAsyncCursor, isAsyncIterable } from "../async-into-iter.js";

type Produced<R> = Iterable<R> | AsyncIterable<R>;

declare module "../async-into-iter.js" {
  interface AsyncIntoIter<T> {
    flatMap<R>(fn: (value: T) => PromiseLike<Produced<R>> | Produced<R>): AsyncIntoIter<R>;
    flatten<R>(this: AsyncIntoIter<Produced<R>>): AsyncIntoIter<R>;
    filterMap<R>(fn: (value: T) => PromiseLike<R | null | undefined> | R | null | undefined): AsyncIntoIter<R>;
  }
}

const openInner = <R>(value: Produced<R>): AsyncCursor<R> => {
  if (isAsyncIterable<R>(value)) {
    const cursor = value[Symbol.asyncIterator]();
    return createAsyncCursor({
      next: () => cursor.next(),
      remaining: undefined,
    });
  }

  const cursor = Iterator.from(value);
  return createAsyncCursor({
    next: async () => cursor.next(),
    remaining: undefined,
  });
};

const flatMapCursor = <T, R>(
  inner: AsyncCursor<T>,
  fn: (value: T) => PromiseLike<Produced<R>> | Produced<R>,
): AsyncCursor<R> => {
  let current: AsyncCursor<R> | undefined;

  return createAsyncCursor({
    next: async () => {
      while (true) {
        if (current) {
          const item = await current.next();
          if (!item.done) return item;
          current = undefined;
        }

        const outer = await inner.next();
        if (outer.done) return { done: true, value: undefined };
        current = openInner(await fn(outer.value));
      }
    },
    remaining: undefined,
  });
};

AsyncIntoIter.prototype.flatMap = function flatMap<T, R>(
  this: AsyncIntoIter<T>,
  fn: (value: T) => PromiseLike<Produced<R>> | Produced<R>,
): AsyncIntoIter<R> {
  return AsyncIntoIter.fromCursor(() => flatMapCursor(this[Symbol.asyncIterator](), fn));
};

AsyncIntoIter.prototype.flatten = function flatten<T>(this: AsyncIntoIter<Produced<T>>): AsyncIntoIter<T> {
  return this.flatMap((value) => value);
};

AsyncIntoIter.prototype.filterMap = function filterMap<T, R>(
  this: AsyncIntoIter<T>,
  fn: (value: T) => PromiseLike<R | null | undefined> | R | null | undefined,
): AsyncIntoIter<R> {
  return this.flatMap(async (value) => {
    const mapped = await fn(value);
    return mapped == null ? [] : [mapped];
  });
};
