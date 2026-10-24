import { IntoIter } from "./into-iter.js";
import { createCursor, Cursor } from "./double-ended-cursor.js";
import { bound, isNotRangeNumber } from "./utils.js";

declare module "./into-iter.js" {
  interface IntoIter<T> {
    skip(count: number): IntoIter<T>;
  }
}

const skipCursor = <T>(inner: Cursor<T>, count: number): Cursor<T> => {
  let left = count;

  const nextBack = bound(inner, inner.nextBack);
  const remaining = bound(inner, inner.remaining);

  return createCursor({
    next: () => {
      while (left > 0) {
        left--;
        const { done } = inner.next();
        if (done) {
          left = 0;
          break;
        }
      }

      return inner.next();
    },
    nextBack: nextBack && remaining && (() => (remaining() > left ? nextBack() : { done: true, value: undefined })),
    remaining: remaining && (() => Math.max(0, remaining() - left)),
  });
};

IntoIter.prototype.skip = function skip<T>(this: IntoIter<T>, count: number) {
  if (isNotRangeNumber(count)) {
    throw new TypeError("Skip must be a non-negative integer");
  }
  return IntoIter.fromCursor(() => skipCursor(this[Symbol.iterator](), count));
};
