import { IntoIter } from "./into-iter.js";
import { bound, isNotRangeNumber } from "./utils.js";

declare module "./into-iter.js" {
  interface IntoIter<T> {
    nth(count: number): T | undefined;
    nthBack(count: number): T | undefined;
    first(): T | undefined;
    last(): T | undefined;
  }
}

const requireIndex = (count: number) => {
  if (isNotRangeNumber(count)) {
    throw new TypeError("Nth must be a non-negative integer");
  }
};

function nth<T>(this: IntoIter<T>, count: number): T | undefined {
  requireIndex(count);
  const cursor = this[Symbol.iterator]();
  for (let index = 0; index < count; index += 1) {
    if (cursor.next().done) return undefined;
  }
  const item = cursor.next();
  return item.done ? undefined : item.value;
}

function nthBack<T>(this: IntoIter<T>, count: number): T | undefined {
  requireIndex(count);
  const cursor = this[Symbol.iterator]();
  const nextBack = bound(cursor, cursor.nextBack);
  if (nextBack) {
    for (let index = 0; index < count; index += 1) {
      if (nextBack().done) return undefined;
    }
    const item = nextBack();
    return item.done ? undefined : item.value;
  }

  const window: T[] = [];
  for (let item = cursor.next(); !item.done; item = cursor.next()) {
    const value: T = item.value;
    window.push(value);
    if (window.length > count + 1) window.shift();
  }
  return window.length === count + 1 ? window[0] : undefined;
}

IntoIter.prototype.nth = nth;
IntoIter.prototype.nthBack = nthBack;
IntoIter.prototype.first = function first<T>(this: IntoIter<T>): T | undefined {
  return this.nth(0);
};
IntoIter.prototype.last = function last<T>(this: IntoIter<T>): T | undefined {
  return this.nthBack(0);
};
