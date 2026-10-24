import { IntoIter } from "./into-iter.js";
import { Cursor, createCursor } from "./double-ended-cursor.js";
import { bound } from "./utils.js";

declare module "./into-iter.js" {
  interface IntoIter<T> {
    map<R>(predicate: (value: T) => R): IntoIter<R>;
  }
}

const mapCursor = <T, R>(inner: Cursor<T>, fn: (value: T) => R): Cursor<R> => {
  const apply = (item: IteratorResult<T>): IteratorResult<R> => {
    return item.done ? { done: true, value: undefined } : { done: false, value: fn(item.value) };
  };

  const nextBack = bound(inner, inner.nextBack);

  return createCursor({
    next: () => apply(inner.next()),
    nextBack: nextBack && (() => apply(nextBack())),
    remaining: bound(inner, inner.remaining),
  });
};

IntoIter.prototype.map = function map<T, R>(this: IntoIter<T>, fn: (value: T) => R): IntoIter<R> {
  return IntoIter.fromCursor(() => mapCursor(this[Symbol.iterator](), fn));
};
