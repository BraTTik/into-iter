import { IntoIter } from "./into-iter.js";
import { createCursor, Cursor } from "./double-ended-cursor.js";
import { bound, isNotRangeNumber } from "./utils.js";

declare module "./into-iter.js" {
  interface IntoIter<T> {
    limit(count: number): IntoIter<T>;
  }
}

function limitCursor<T>(inner: Cursor<T>, count: number): Cursor<T> {
  let left = count;
  const nextBack = bound(inner, inner.nextBack);
  const remaining = bound(inner, inner.remaining);

  return createCursor({
    next: () => {
      if (left <= 0) return { done: true, value: undefined };
      left--;
      return inner.next();
    },
    nextBack:
      remaining &&
      nextBack &&
      (() => {
        if (left <= 0) return { done: true, value: undefined };
        /** Прокручиваем хвост */
        for (let excess = remaining() - left; excess > 0; excess--) {
          nextBack();
        }
        left--;
        return nextBack();
      }),
    remaining: remaining && (() => Math.max(0, Math.min(left, remaining()))),
  });
}

IntoIter.prototype.limit = function limit<T>(this: IntoIter<T>, count: number): IntoIter<T> {
  if (isNotRangeNumber(count)) {
    throw new TypeError("Limit must be a positive integer");
  }
  return IntoIter.fromCursor(() => limitCursor(this[Symbol.iterator](), count));
};
