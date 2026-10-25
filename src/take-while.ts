import { IntoIter } from "./into-iter.js";
import { Cursor, createCursor } from "./double-ended-cursor.js";

declare module "./into-iter.js" {
  interface IntoIter<T> {
    takeWhile(predicate: (value: T) => boolean): IntoIter<T>;
  }
}

const takeWhileCursor = <T>(inner: Cursor<T>, predicate: (value: T) => boolean) => {
  let stopped = false;
  return createCursor({
    next: () => {
      if (stopped) return { done: true, value: undefined };
      const next = inner.next();
      if (next.done || predicate(next.value)) return next;
      stopped = true;
      return { done: true, value: undefined };
    },
    nextBack: undefined,
    remaining: undefined,
  });
};

IntoIter.prototype.takeWhile = function takeWhile<T>(this: IntoIter<T>, predicate: (value: T) => boolean) {
  return IntoIter.fromCursor(() => takeWhileCursor(this[Symbol.iterator](), predicate));
};
