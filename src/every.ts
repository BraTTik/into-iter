import { IntoIter } from "./into-iter.js";

declare module "./into-iter.js" {
  interface IntoIter<T> {
    every(fn: (value: T) => boolean): boolean;
    some(fn: (value: T) => boolean): boolean;
  }
}

const search = <T>(values: IntoIter<T>, fn: (value: T) => boolean, match: boolean): boolean => {
  for (const value of values) {
    if (fn(value) === match) return match;
  }
  return !match;
};

IntoIter.prototype.every = function every<T>(this: IntoIter<T>, fn: (value: T) => boolean): boolean {
  return search(this, fn, false);
};

IntoIter.prototype.some = function some<T>(this: IntoIter<T>, fn: (value: T) => boolean): boolean {
  return search(this, fn, true);
};
