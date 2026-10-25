import { IntoIter } from "./into-iter.js";
import { bound } from "./utils.js";

declare module "./into-iter.js" {
  interface IntoIter<T> {
    find(fn: (value: T) => boolean): T | undefined;
    findMap<R>(fn: (value: T) => R | undefined): R | undefined;
    findLast(fn: (value: T) => boolean): T | undefined;
    position(fn: (value: T) => boolean): number | undefined;
  }
}

const skipped = Symbol("find.skipped");

const scan = <T, R>(
  step: () => IteratorResult<T>,
  pick: (value: T, index: number) => R | typeof skipped,
  last: boolean,
): R | undefined => {
  let found: R | undefined;
  let has = false;
  let index = 0;
  for (let item = step(); !item.done; item = step()) {
    const value: T = item.value;
    const mapped = pick(value, index);
    index += 1;
    if (mapped === skipped) continue;
    if (!last) return mapped;
    found = mapped;
    has = true;
  }
  return has ? found : undefined;
};

const forward = <T>(values: IntoIter<T>): (() => IteratorResult<T>) => {
  const cursor = values[Symbol.iterator]();
  return () => cursor.next();
};

IntoIter.prototype.find = function find<T>(this: IntoIter<T>, fn: (value: T) => boolean): T | undefined {
  return scan(forward(this), (value) => (fn(value) ? value : skipped), false);
};

IntoIter.prototype.findMap = function findMap<T, R>(this: IntoIter<T>, fn: (value: T) => R | undefined): R | undefined {
  return scan(
    forward(this),
    (value) => {
      const mapped = fn(value);
      return mapped == null ? skipped : mapped;
    },
    false,
  );
};

IntoIter.prototype.position = function position<T>(this: IntoIter<T>, fn: (value: T) => boolean): number | undefined {
  return scan(forward(this), (value, index) => (fn(value) ? index : skipped), false);
};

IntoIter.prototype.findLast = function findLast<T>(this: IntoIter<T>, fn: (value: T) => boolean): T | undefined {
  const cursor = this[Symbol.iterator]();
  const nextBack = bound(cursor, cursor.nextBack);
  const step = nextBack ?? (() => cursor.next());
  return scan(step, (value) => (fn(value) ? value : skipped), nextBack === undefined);
};
