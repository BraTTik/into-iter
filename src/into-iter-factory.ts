import { RangeOptions, isRangeOptions } from "./range-iterator.js";
import { IntoIter } from "./into-iter.js";

export function intoIter(rangeOptions: RangeOptions): IntoIter<number>;
export function intoIter(range: number): IntoIter<number>;
export function intoIter<T>(iterable: Iterable<T>): IntoIter<T>;
export function intoIter<T>(args: RangeOptions | number | Iterable<T>) {
  if (isRangeOptions(args)) {
    return IntoIter.fromRange(args);
  } else if (typeof args === "number") {
    return IntoIter.fromRange(args);
  }

  return IntoIter.fromIterable(args);
}
