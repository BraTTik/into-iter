import { RangeOptions, rangeIterator } from "./range-iterator.js";
import { arrayLikeDoubleEndedCursor, isArrayLike } from "./double-ended-cursor.js";

export class IntoIter<T> {
  protected iterable: Iterable<T>;

  static fromIterable<T>(iterable: Iterable<T>): IntoIter<T> {
    if (isArrayLike(iterable)) {
      return new IntoIter<T>({
        [Symbol.iterator]: () => arrayLikeDoubleEndedCursor<T>(iterable as ArrayLike<T>),
      });
    }
    return new IntoIter(iterable);
  }

  static fromRange(range: number): IntoIter<number>;
  static fromRange(options: RangeOptions): IntoIter<number>;
  static fromRange(options: RangeOptions | number): IntoIter<number> {
    return new IntoIter<number>({
      [Symbol.iterator]: () => rangeIterator(options as RangeOptions),
    });
  }

  protected constructor(iterable: Iterable<T>) {
    this.iterable = iterable;
  }

  map<R>(fn: (vl: T) => R): IntoIter<R> {
    return new IntoIter({ [Symbol.iterator]: () => Iterator.from(this.iterable[Symbol.iterator]()).map(fn) });
  }

  [Symbol.iterator](): IteratorObject<T> {
    const iter = this.iterable[Symbol.iterator]();
    return Iterator.from({
      next: () => iter.next(),
    });
  }
}
