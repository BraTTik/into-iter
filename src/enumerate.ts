import { IntoIter } from "./into-iter.js";
import { Cursor, createCursor } from "./double-ended-cursor.js";
import { bound } from "./utils.js";

declare module "./into-iter.js" {
  interface IntoIter<T> {
    enumerate(this: IntoIter<T>): IntoIter<[number, T]>;
  }
}

const enumerateCursor = <T>(inner: Cursor<T>): Cursor<[number, T]> => {
  let index = 0;
  const nextBack = bound(inner, inner.nextBack);
  const remaining = bound(inner, inner.remaining);

  return createCursor({
    next: (): IteratorResult<[number, T]> => {
      const item = inner.next();
      if (item.done) return { done: true, value: undefined };
      const value: T = item.value;
      return { done: false, value: [index++, value] };
    },
    nextBack:
      nextBack &&
      remaining &&
      ((): IteratorResult<[number, T]> => {
        const item = nextBack();
        if (item.done) return { done: true, value: undefined };
        const value: T = item.value;
        return { done: false, value: [index + remaining(), value] };
      }),
    remaining: remaining && (() => remaining()),
  });
};

IntoIter.prototype.enumerate = function enumerate<T>(this: IntoIter<T>): IntoIter<[number, T]> {
  return IntoIter.fromCursor(() => enumerateCursor(this[Symbol.iterator]()));
};
