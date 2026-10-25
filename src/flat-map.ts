import { IntoIter } from "./into-iter.js";
import { Cursor, createCursor } from "./double-ended-cursor.js";
import { bound } from "./utils.js";

declare module "./into-iter.js" {
  interface IntoIter<T> {
    flatMap<R>(map: (value: T) => Iterable<R>): IntoIter<R>;
    flatten<R>(this: IntoIter<Iterable<R>>): IntoIter<R>;
    filterMap<R>(this: IntoIter<T>, fn: (value: T) => R | undefined): IntoIter<R>;
  }
}

const flatMapCursor = <T, R>(inner: Cursor<T>, fn: (value: T) => Iterable<R>): Cursor<R> => {
  const open = (item: T): IntoIter<R> => {
    return IntoIter.fromIterable(fn(item));
  };

  let forwardIter: Cursor<R> | undefined;
  let backwardIter: Cursor<R> | undefined;

  const nextBack = bound(inner, inner.nextBack);
  const next = bound(inner, inner.next);

  const witCurrentIter =
    (opt: {
      current: () => Cursor<R> | undefined;
      backward: () => Cursor<R> | undefined;
      resetCurrent: () => void;
      openCurrent: (value: T) => void;
      outerNext: () => IteratorResult<T>;
    }) =>
    (): IteratorResult<R> => {
      const { current, openCurrent, resetCurrent, outerNext, backward } = opt;
      while (true) {
        const currentIterator = current();
        if (currentIterator) {
          const res = currentIterator.next();

          if (!res.done) {
            return res;
          }
          resetCurrent();
        }

        const outer = outerNext();
        if (outer.done) {
          const back = backward()?.nextBack?.();
          if (back && !back?.done) return { done: false, value: back.value };
          return { done: true, value: undefined };
        }
        openCurrent(outer.value);
      }
    };

  return createCursor({
    next: witCurrentIter({
      current: () => forwardIter,
      backward: () => backwardIter,
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
        backward: () => forwardIter,
        outerNext: nextBack,
        openCurrent: (value: T) => {
          backwardIter = open(value).reversed[Symbol.iterator]();
        },
        resetCurrent: () => {
          backwardIter = undefined;
        },
      }),
    remaining: undefined,
  });
};

IntoIter.prototype.flatMap = function flatMap<T, R>(this: IntoIter<T>, fn: (value: T) => Iterable<R>) {
  return IntoIter.fromCursor(() => flatMapCursor(this[Symbol.iterator](), fn));
};

IntoIter.prototype.flatten = function flatten<T>(this: IntoIter<Iterable<T>>): IntoIter<T> {
  return this.flatMap((val) => val);
};

IntoIter.prototype.filterMap = function filterMap<T, R>(this: IntoIter<T>, fn: (value: T) => R | undefined) {
  return this.flatMap((value) => {
    const mapped = fn(value);
    return mapped == null ? [] : [mapped];
  });
};
