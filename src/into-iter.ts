import { RangeOptions, rangeIterator } from "./range-iterator.js";
import { arrayLikeDoubleEndedCursor, isArrayLike, Cursor } from "./double-ended-cursor.js";

export class IntoIter<T> {
  protected _reversed = false;

  get reversed(): IntoIter<T> {
    const next = this.clone();
    next._reversed = !this._reversed;
    return next;
  }

  static fromCursor<T>(open: () => Cursor<T>) {
    return new IntoIter(open);
  }

  static fromIterable<T>(iterable: Iterable<T>): IntoIter<T> {
    if (isArrayLike<T>(iterable)) {
      return new IntoIter<T>(() => arrayLikeDoubleEndedCursor<T>(iterable));
    }
    return new IntoIter(() => Iterator.from(iterable));
  }

  static fromRange(range: number): IntoIter<number>;
  static fromRange(options: RangeOptions): IntoIter<number>;
  static fromRange(options: RangeOptions | number): IntoIter<number> {
    return new IntoIter<number>(() => rangeIterator(options as RangeOptions));
  }

  protected constructor(protected open: () => Cursor<T>) {}

  protected clone() {
    return IntoIter.fromCursor(this.open);
  }

  [Symbol.iterator](): Cursor<T> {
    const cursor = this.open();
    if (!this._reversed) return cursor;
    if (!cursor.nextBack) {
      throw new Error("Cannot walk backwards");
    }

    return {
      [Symbol.iterator](): Cursor<T> {
        return this;
      },
      next: () => cursor.nextBack!(),
      nextBack: () => cursor.next(),
    };
  }
}
