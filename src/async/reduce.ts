import { AsyncIntoIter } from "../async-into-iter.js";

declare module "../async-into-iter.js" {
  interface AsyncIntoIter<T> {
    reduce(fn: (acc: T, value: T) => PromiseLike<T> | T): Promise<T | undefined>;
  }
}

AsyncIntoIter.prototype.reduce = async function reduce<T>(
  this: AsyncIntoIter<T>,
  fn: (acc: T, value: T) => PromiseLike<T> | T,
): Promise<T | undefined> {
  const cursor = this[Symbol.asyncIterator]();
  const first = await cursor.next();
  if (first.done) return undefined;

  let acc: T = first.value;
  for (let item = await cursor.next(); !item.done; item = await cursor.next()) {
    const value: T = item.value;
    acc = await fn(acc, value);
  }
  return acc;
};
