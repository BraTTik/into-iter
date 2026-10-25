import { bound } from "./utils.js";

export type AsyncCursor<T> = AsyncIterator<T> & {
  remaining?: (() => number) | undefined;
  [Symbol.asyncIterator](): AsyncCursor<T>;
};

export type AsyncCursorParts<T> = {
  next: () => Promise<IteratorResult<T>>;
  remaining: (() => number) | undefined;
};

export const createAsyncCursor = <T>({ next, remaining }: AsyncCursorParts<T>): AsyncCursor<T> => {
  const cursor: AsyncCursor<T> = {
    next,
    [Symbol.asyncIterator]() {
      return this;
    },
  };
  if (remaining) cursor.remaining = remaining;

  return cursor;
};

export function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return value != null && typeof (value as AsyncIterable<T>)[Symbol.asyncIterator] === "function";
}

export class AsyncIntoIter<T> {
  static fromCursor<T>(open: () => AsyncCursor<T>): AsyncIntoIter<T> {
    return new AsyncIntoIter(open);
  }

  static fromAsyncIterable<T>(source: AsyncIterable<T>): AsyncIntoIter<T> {
    return new AsyncIntoIter(() => {
      const inner = source[Symbol.asyncIterator]();
      return createAsyncCursor({
        next: () => inner.next(),
        remaining: bound(inner, (inner as AsyncCursor<T>).remaining),
      });
    });
  }

  protected constructor(protected open: () => AsyncCursor<T>) {}

  [Symbol.asyncIterator](): AsyncCursor<T> {
    return this.open();
  }
}
