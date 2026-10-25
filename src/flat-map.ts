import { IntoIter } from "./into-iter.js";
import { Cursor, createCursor } from "./double-ended-cursor.js";
import { bound } from "./utils.js";

declare module "./into-iter.js" {
  interface IntoIter<T> {
    flatMap<R>(map: (value: T) => Iterable<R>): IntoIter<R>;
  }
}

const flatMapCursor = <T, R>(inner: Cursor<T>, fn: (value: T) => Iterable<R>): Cursor<R> => {
  const open = (item: T): IntoIter<R> => {
    return IntoIter.fromIterable(fn(item));
  };

  let forwardIter: Iterator<R> | undefined;
  let backwardIter: Iterator<R> | undefined;

  let remain = 0;

  const remaining = bound(inner, inner.remaining);
  const nextBack = bound(inner, inner.nextBack);
  const next = bound(inner, inner.next);

  const getRemain = () => {
    console.log(remain);
    return remain;
  };

  const witCurrentIter =
    (opt: {
      current: () => Iterator<R> | undefined;
      resetCurrent: () => void;
      openCurrent: (value: T) => void;
      outerNext: () => IteratorResult<T>;
    }) =>
    (): IteratorResult<R> => {
      const { current, openCurrent, resetCurrent, outerNext } = opt;
      while (true) {
        const currentIterator = current();
        if (currentIterator) {
          const res = currentIterator.next();

          if (!res.done) {
            remain++;
            return res;
          }
          resetCurrent();
        }

        const outer = outerNext();
        if (outer.done) return { done: true, value: undefined };
        openCurrent(outer.value);
      }
    };

  return createCursor({
    next: witCurrentIter({
      current: () => forwardIter,
      outerNext: next!,
      openCurrent: (value: T) => {
        forwardIter = open(value)[Symbol.iterator]();
      },
      resetCurrent: () => {
        forwardIter = undefined;
      },
    }),
    nextBack:
      nextBack &&
      witCurrentIter({
        current: () => {
          return backwardIter;
        },
        outerNext: nextBack,
        openCurrent: (value: T) => {
          backwardIter = open(value).reversed[Symbol.iterator]();
        },
        resetCurrent: () => {
          backwardIter = undefined;
        },
      }),
    remaining: remaining && (() => Math.max(remaining(), getRemain())),
  });
};

IntoIter.prototype.flatMap = function flatMap<T, R>(this: IntoIter<T>, fn: (value: T) => Iterable<R>) {
  return IntoIter.fromCursor(() => flatMapCursor(this[Symbol.iterator](), fn));
};
