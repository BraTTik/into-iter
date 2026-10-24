import { IntoIter } from "./into-iter.js";
import { Cursor } from "./double-ended-cursor.js";

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

  const cursor: Cursor<T> = {
    next: find(() => inner.next()),
    [Symbol.iterator]() {
      return this;
    },
  };

  if (inner.nextBack) {
    const nextBack = inner.nextBack.bind(inner);
    cursor.nextBack = find(() => nextBack());
  }

  return cursor;
};

IntoIter.prototype.filter = function filter<T>(this: IntoIter<T>, predicate: (value: T) => boolean): IntoIter<T> {
  return IntoIter.fromCursor(() => filterCursor(this[Symbol.iterator](), predicate));
};
