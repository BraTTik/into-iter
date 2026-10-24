import { IntoIter } from "./into-iter.js";
import type { Cursor } from "./double-ended-cursor.js";

declare module "./into-iter.js" {
  interface IntoIter<T> {
    map<R>(predicate: (value: T) => R): IntoIter<R>;
  }
}

const mapCursor = <T, R>(inner: Cursor<T>, fn: (value: T) => R): Cursor<R> => {
  const apply = (item: IteratorResult<T>): IteratorResult<R> => {
    return item.done ? { done: true, value: undefined } : { done: false, value: fn(item.value) };
  };

  const cursor: Cursor<R> = {
    next: () => apply(inner.next()),
    [Symbol.iterator]() {
      return this;
    },
  };

  if (inner.nextBack) {
    const nextBack = inner.nextBack.bind(inner);
    cursor.nextBack = () => apply(nextBack());
  }

  return cursor;
};

IntoIter.prototype.map = function map<T, R>(this: IntoIter<T>, fn: (value: T) => R): IntoIter<R> {
  return IntoIter.fromCursor(() => mapCursor(this[Symbol.iterator](), fn));
};
