import { IntoIter } from "./into-iter.js";
import { createCursor, Cursor } from "./double-ended-cursor.js";

declare module "./into-iter.js" {
  interface IntoIter<T> {
    skipWhile(predicate: (value: T) => boolean): IntoIter<T>;
  }
}

const skipWhileCursor = <T>(cursor: Cursor<T>, predicate: (value: T) => boolean): Cursor<T> => {
  let skipped = false;
  return createCursor({
    next: () => {
      let item = cursor.next();
      while (!skipped) {
        if (!item.done && predicate(item.value)) {
          item = cursor.next();
          continue;
        }
        skipped = true;
        break;
      }
      return item;
    },
    nextBack: undefined,
    remaining: undefined,
  });
};

IntoIter.prototype.skipWhile = function skipWhile<T>(this: IntoIter<T>, predicate: (value: T) => boolean) {
  return IntoIter.fromCursor(() => skipWhileCursor(this[Symbol.iterator](), predicate));
};
