import { AsyncIntoIter } from "../async-into-iter.js";
import { isNotRangeNumber } from "../utils.js";

declare module "../async-into-iter.js" {
  interface AsyncIntoIter<T> {
    nth(count: number): Promise<T | undefined>;
    first(): Promise<T | undefined>;
    last(): Promise<T | undefined>;
  }
}

const requireIndex = (count: number) => {
  if (isNotRangeNumber(count)) {
    throw new TypeError("Nth must be a non-negative integer");
  }
};

async function readNth<T>(values: AsyncIntoIter<T>, count: number): Promise<T | undefined> {
  const cursor = values[Symbol.asyncIterator]();
  for (let index = 0; index < count; index += 1) {
    if ((await cursor.next()).done) return undefined;
  }
  const item = await cursor.next();
  return item.done ? undefined : item.value;
}

function nth<T>(this: AsyncIntoIter<T>, count: number): Promise<T | undefined> {
  requireIndex(count);
  return readNth(this, count);
}

AsyncIntoIter.prototype.nth = nth;
AsyncIntoIter.prototype.first = function first<T>(this: AsyncIntoIter<T>): Promise<T | undefined> {
  return this.nth(0);
};
AsyncIntoIter.prototype.last = async function last<T>(this: AsyncIntoIter<T>): Promise<T | undefined> {
  const cursor = this[Symbol.asyncIterator]();
  let found: T | undefined;
  let has = false;
  for (let item = await cursor.next(); !item.done; item = await cursor.next()) {
    found = item.value;
    has = true;
  }
  return has ? found : undefined;
};
