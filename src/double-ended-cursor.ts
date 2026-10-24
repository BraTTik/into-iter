export type Cursor<T> = Iterator<T> & {
  nextBack?: () => IteratorResult<T>;
  [Symbol.iterator](): Cursor<T>;
};

export type DoubleEndedCursor<T> = Cursor<T> & {
  nextBack: () => IteratorResult<T>;
  [Symbol.iterator](): DoubleEndedCursor<T>;
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

export const arrayLikeDoubleEndedCursor = <T>(arr: ArrayLike<T>): DoubleEndedCursor<T> => {
  let start = 0;
  let end = arr.length - 1;

  const withDone = (callback: () => IteratorResult<T>) => (): IteratorResult<T> => {
    if (start > end) return { done: true, value: undefined };
    return callback();
  };

  return {
    next: withDone(() => ({ done: false, value: arr[start++] })),
    nextBack: withDone(() => ({ done: false, value: arr[end--] })),
    [Symbol.iterator]() {
      return this;
    },
  };
};
