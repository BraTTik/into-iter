import { AsyncIntoIter } from "../async-into-iter.js";

declare module "../async-into-iter.js" {
  interface AsyncIntoIter<T> {
    find(fn: (value: T) => PromiseLike<boolean> | boolean): Promise<T | undefined>;
    findMap<R>(fn: (value: T) => PromiseLike<R | null | undefined> | R | null | undefined): Promise<R | undefined>;
    findLast(fn: (value: T) => PromiseLike<boolean> | boolean): Promise<T | undefined>;
    position(fn: (value: T) => PromiseLike<boolean> | boolean): Promise<number | undefined>;
  }
}

const skipped = Symbol("find.skipped");

const scan = async <T, R>(
  values: AsyncIntoIter<T>,
  pick: (value: T, index: number) => PromiseLike<R | typeof skipped> | R | typeof skipped,
  last: boolean,
): Promise<R | undefined> => {
  let found: R | undefined;
  let has = false;
  let index = 0;
  for await (const value of values) {
    const mapped = await pick(value, index);
    index += 1;
    if (mapped === skipped) continue;
    if (!last) return mapped;
    found = mapped;
    has = true;
  }
  return has ? found : undefined;
};

AsyncIntoIter.prototype.find = function find<T>(
  this: AsyncIntoIter<T>,
  fn: (value: T) => PromiseLike<boolean> | boolean,
): Promise<T | undefined> {
  return scan(this, async (value) => ((await fn(value)) ? value : skipped), false);
};

AsyncIntoIter.prototype.findMap = function findMap<T, R>(
  this: AsyncIntoIter<T>,
  fn: (value: T) => PromiseLike<R | null | undefined> | R | null | undefined,
): Promise<R | undefined> {
  return scan(
    this,
    async (value) => {
      const mapped = await fn(value);
      return mapped == null ? skipped : mapped;
    },
    false,
  );
};

AsyncIntoIter.prototype.position = function position<T>(
  this: AsyncIntoIter<T>,
  fn: (value: T) => PromiseLike<boolean> | boolean,
): Promise<number | undefined> {
  return scan(this, async (value, index) => ((await fn(value)) ? index : skipped), false);
};

AsyncIntoIter.prototype.findLast = function findLast<T>(
  this: AsyncIntoIter<T>,
  fn: (value: T) => PromiseLike<boolean> | boolean,
): Promise<T | undefined> {
  return scan(this, async (value) => ((await fn(value)) ? value : skipped), true);
};
