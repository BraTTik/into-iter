import { RangeOptions, rangeIterator } from "./range-iterator";

export class IntoIter<T> {
  static fromIterable<T>(iterable: Iterable<T>): IntoIter<T> {
    return new IntoIter(iterable);
  }

  static fromRange(range: number): IntoIter<number>;
  static fromRange(options: RangeOptions): IntoIter<number>;
  static fromRange(options: RangeOptions | number): IntoIter<number> {
    return new IntoIter<number>(rangeIterator(options as RangeOptions));
  }

  protected constructor(iterable: Iterable<T>) {}
}
