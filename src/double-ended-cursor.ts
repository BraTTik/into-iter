export type Cursor<T> = Iterator<T> & {
  nextBack?: (() => IteratorResult<T>) | undefined;
  remaining?: (() => number) | undefined;
  [Symbol.iterator](): Cursor<T>;
};

export type DoubleEndedCursor<T> = Cursor<T> & {
  nextBack: () => IteratorResult<T>;
  [Symbol.iterator](): DoubleEndedCursor<T>;
};

export type CursorParts<T> = {
  next: () => IteratorResult<T>;
  nextBack: (() => IteratorResult<T>) | undefined;
  remaining: (() => number) | undefined;
};

export function isArrayLike<T>(a: unknown): a is ArrayLike<T> {
  if (typeof a === "string") return true;
  return (
    a != null &&
    typeof a === "object" &&
    typeof (a as Iterable<T>)[Symbol.iterator] === "function" &&
    typeof (a as ArrayLike<T>).length === "number"
  );
}

export const createCursor = <T>({ next, nextBack, remaining }: CursorParts<T>): Cursor<T> => {
  const cursor: Cursor<T> = {
    next,
    [Symbol.iterator]() {
      return this;
    },
  };
  if (nextBack) cursor.nextBack = nextBack;
  if (remaining) cursor.remaining = remaining;

  return cursor;
};

export const arrayLikeDoubleEndedCursor = <T>(arr: ArrayLike<T>): DoubleEndedCursor<T> => {
  let start = 0;
  let end = arr.length;

  const withDone = (callback: () => IteratorResult<T>) => (): IteratorResult<T> => {
    if (start >= end) return { done: true, value: undefined };
    return callback();
  };

  return {
    next: withDone(() => ({ done: false, value: arr[start++] })),
    nextBack: withDone(() => ({ done: false, value: arr[--end] })),
    remaining: () => end - start,
    [Symbol.iterator]() {
      return this;
    },
  };
};
