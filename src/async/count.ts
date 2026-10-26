import { AsyncIntoIter } from "../async-into-iter.js";

declare module "../async-into-iter.js" {
  interface AsyncIntoIter<T> {
    count(this: AsyncIntoIter<T>): Promise<number>;
  }
}

AsyncIntoIter.prototype.count = async function count<T>(this: AsyncIntoIter<T>): Promise<number> {
  const cursor = this[Symbol.asyncIterator]();
  if (cursor.remaining) return cursor.remaining();

  let count = 0;
  while (!(await cursor.next()).done) count += 1;
  return count;
};
