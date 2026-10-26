import { AsyncIntoIter } from "../async-into-iter.js";

declare module "../async-into-iter.js" {
  interface AsyncIntoIter<T> {
    every(fn: (value: T) => PromiseLike<boolean> | boolean): Promise<boolean>;
    some(fn: (value: T) => PromiseLike<boolean> | boolean): Promise<boolean>;
  }
}

const search = async <T>(
  values: AsyncIntoIter<T>,
  fn: (value: T) => PromiseLike<boolean> | boolean,
  match: boolean,
): Promise<boolean> => {
  for await (const value of values) {
    if ((await fn(value)) === match) return match;
  }
  return !match;
};

AsyncIntoIter.prototype.every = function every<T>(
  this: AsyncIntoIter<T>,
  fn: (value: T) => PromiseLike<boolean> | boolean,
): Promise<boolean> {
  return search(this, fn, false);
};

AsyncIntoIter.prototype.some = function some<T>(
  this: AsyncIntoIter<T>,
  fn: (value: T) => PromiseLike<boolean> | boolean,
): Promise<boolean> {
  return search(this, fn, true);
};
