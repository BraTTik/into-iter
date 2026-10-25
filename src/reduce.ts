import { IntoIter } from "./into-iter.js";

declare module "./into-iter.js" {
  interface IntoIter<T> {
    reduce(fn: (acc: T, value: T) => T): T | undefined;
  }
}

IntoIter.prototype.reduce = function reduce<T>(this: IntoIter<T>, fn: (acc: T, value: T) => T): T | undefined {
  const cursor = this[Symbol.iterator]();
  const first = cursor.next();
  if (first.done) return undefined;

  let acc: T = first.value;
  for (let item = cursor.next(); !item.done; item = cursor.next()) {
    const value: T = item.value;
    acc = fn(acc, value);
  }
  return acc;
};
