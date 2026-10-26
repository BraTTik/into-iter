import { AsyncIntoIter } from "../async-into-iter.js";

declare module "../async-into-iter.js" {
  interface AsyncIntoIter<T> {
    fold<R>(init: R, fn: (acc: R, value: T) => PromiseLike<R> | R): Promise<R>;
  }
}

AsyncIntoIter.prototype.fold = async function fold<T, R>(
  this: AsyncIntoIter<T>,
  init: R,
  fn: (acc: R, value: T) => PromiseLike<R> | R,
): Promise<R> {
  const cursor = this[Symbol.asyncIterator]();

  for (let step = await cursor.next(); !step.done; step = await cursor.next()) {
    init = await fn(init, step.value);
  }

  return init;
};
