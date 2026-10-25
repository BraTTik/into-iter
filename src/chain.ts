import { IntoIter } from "./into-iter.js";
import { createCursor, Cursor } from "./double-ended-cursor.js";
import { bound } from "./utils.js";

declare module "./into-iter.js" {
  interface IntoIter<T> {
    chain(iterable: Iterable<T>): IntoIter<T>;
  }
}

const openCursor = <T>(intoIter: IntoIter<T>): Cursor<T> => intoIter[Symbol.iterator]();

const chainCursor = <T>(inner: Cursor<T>, chainCursor: Cursor<T>): Cursor<T> => {
  const nextBack = bound(inner, inner.nextBack);
  const chainNextBack = bound(chainCursor, chainCursor.nextBack);

  const remaining = bound(inner, inner.remaining);
  const chainRemaining = bound(chainCursor, chainCursor.remaining);

  return createCursor({
    next: () => {
      const next = inner.next();
      if (!next.done) return next;
      return chainCursor.next();
    },
    nextBack:
      nextBack &&
      chainNextBack &&
      (() => {
        const next = chainNextBack();
        if (!next.done) return next;
        return nextBack();
      }),
    remaining: remaining && chainRemaining && (() => remaining() + chainRemaining()),
  });
};

IntoIter.prototype.chain = function chain<T>(this: IntoIter<T>, iter: Iterable<T>): IntoIter<T> {
  return IntoIter.fromCursor(() => chainCursor(openCursor(this), openCursor(IntoIter.fromIterable(iter))));
};
