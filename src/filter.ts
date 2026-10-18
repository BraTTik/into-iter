import { IntoIter } from "./into-iter.js";

declare module "./into-iter.js" {
  interface IntoIter<T> {
    filter(predicate: (value: T) => boolean): IntoIter<T>;
  }
}

IntoIter.prototype.filter = function filter<T>(this: IntoIter<T>, predicate: (value: T) => boolean): IntoIter<T> {
  return IntoIter.fromIterable({
    [Symbol.iterator]: () => Iterator.from(this[Symbol.iterator]()).filter(predicate),
  });
};
