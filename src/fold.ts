import { IntoIter } from "./into-iter.js";

declare module "./into-iter.js" {
  interface IntoIter<T> {
    fold<R>(init: R, fn: (acc: R, value: T) => R): R;
    foldRight<R>(init: R, fn: (acc: R, value: T) => R): R;
  }
}

IntoIter.prototype.fold = function fold<T, R>(this: IntoIter<T>, init: R, fn: (acc: R, value: T) => R): R {
  const iterator = this[Symbol.iterator]();

  for (let step = iterator.next(); !step.done; step = iterator.next()) {
    init = fn(init, step.value);
  }

  return init;
};

IntoIter.prototype.foldRight = function foldRight<T, R>(this: IntoIter<T>, init: R, fn: (acc: R, value: T) => R): R {
  const iterator = this[Symbol.iterator]();
  if (!iterator.nextBack) throw new Error("Cannot walk backwards");

  for (let step = iterator.nextBack(); !step.done; step = iterator.nextBack()) {
    init = fn(init, step.value);
  }

  return init;
};
