import { IntoIter } from "./into-iter.js";
import { Cursor, createCursor } from "./double-ended-cursor.js";
import { bound } from "./utils.js";

declare module "./into-iter.js" {
  interface IntoIter<T> {
    filter(predicate: (value: T) => boolean): IntoIter<T>;
  }
}

const filterCursor = <T>(inner: Cursor<T>, predicate: (value: T) => boolean) => {
  const find = (step: () => IteratorResult<T>) => (): IteratorResult<T> => {
    for (let item = step(); !item.done; item = step()) {
      if (predicate(item.value)) return item;
    }
    return { done: true, value: undefined };
  };

  const nextBack = bound(inner, inner.nextBack);

  return createCursor({
    next: find(() => inner.next()),
    nextBack: nextBack && find(() => nextBack()),
    remaining: undefined,
  });
};

IntoIter.prototype.filter = function filter<T>(this: IntoIter<T>, predicate: (value: T) => boolean): IntoIter<T> {
  return IntoIter.fromCursor(() => filterCursor(this[Symbol.iterator](), predicate));
};
