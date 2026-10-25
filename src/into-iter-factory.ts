import { RangeOptions, isRangeOptions } from "./range-iterator.js";
import { IntoIter } from "./into-iter.js";
import { AsyncIntoIter, isAsyncIterable } from "./async-into-iter.js";

export function intoIter(rangeOptions: RangeOptions): IntoIter<number>;
export function intoIter(range: number): IntoIter<number>;
export function intoIter<T>(source: AsyncIterable<T>): AsyncIntoIter<T>;
export function intoIter<T>(source: Iterable<T>): IntoIter<T>;
export function intoIter<T>(args: RangeOptions | number | AsyncIterable<T> | Iterable<T>) {
  if (isRangeOptions(args)) {
    return IntoIter.fromRange(args);
  } else if (typeof args === "number") {
    return IntoIter.fromRange(args);
  } else if (isAsyncIterable<T>(args)) {
    return AsyncIntoIter.fromAsyncIterable(args);
  }

  return IntoIter.fromIterable(args);
}
