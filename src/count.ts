import { IntoIter } from "./into-iter.js";

declare module "./into-iter.js" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface IntoIter<T> {
    count(): number;
  }
}

IntoIter.prototype.count = function count<T>(this: IntoIter<T>): number {
  const cursor = this[Symbol.iterator]();
  if (cursor.remaining) return cursor.remaining();

  let count = 0;
  while (!cursor.next().done) count++;
  return count;
};
