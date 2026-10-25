import { IntoIter } from "./into-iter.js";
import { createCursor, Cursor } from "./double-ended-cursor.js";

declare module "./into-iter.js" {
  interface IntoIter<T> {
    mapWhile<R>(fn: (value: T) => R | undefined): IntoIter<R>;
  }
}

const mapWhileCursor = <T, R>(inner: Cursor<T>, fn: (value: T) => R | undefined): Cursor<R> => {
  let stopped = false;
  return createCursor({
    next: () => {
      if (stopped) return { done: true, value: undefined };
      const next = inner.next();
      if (next.done) return next;
      const nextValue = fn(next.value);

      if (nextValue == null) {
        stopped = true;
      } else {
        return { done: false, value: nextValue };
      }

      return { done: true, value: undefined };
    },
    nextBack: undefined,
    remaining: undefined,
  });
};

IntoIter.prototype.mapWhile = function mapWhile<T, R>(this: IntoIter<T>, fn: (value: T) => R | undefined) {
  return IntoIter.fromCursor(() => mapWhileCursor(this[Symbol.iterator](), fn));
};
