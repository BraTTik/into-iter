import { IntoIter } from "./into-iter.js";

type NumMethod<T> = [T] extends [number] ? () => number : [T] extends [bigint] ? () => bigint : never;
type MaybeNumMethod<T> = [T] extends [number]
  ? () => number | undefined
  : [T] extends [bigint]
    ? () => bigint | undefined
    : never;

declare module "./into-iter.js" {
  interface IntoIter<T> {
    sum: NumMethod<T>;
    avg: NumMethod<T>;
    product: NumMethod<T>;
    min: MaybeNumMethod<T>;
    max: MaybeNumMethod<T>;
  }
}

function add(total: number | bigint, value: number | bigint): number | bigint {
  if (typeof total === "bigint" || typeof value === "bigint") return BigInt(total) + BigInt(value);
  return total + value;
}

function mul(total: number | bigint, value: number | bigint): number | bigint {
  if (typeof total === "bigint" || typeof value === "bigint") return BigInt(total) * BigInt(value);
  return total * value;
}

function less(left: number | bigint, right: number | bigint): boolean {
  if (typeof left === "bigint" || typeof right === "bigint") return BigInt(left) < BigInt(right);
  return left < right;
}

function greater(left: number | bigint, right: number | bigint): boolean {
  if (typeof left === "bigint" || typeof right === "bigint") return BigInt(left) > BigInt(right);
  return left > right;
}

function pick(
  values: IntoIter<number | bigint>,
  better: (candidate: number | bigint, current: number | bigint) => boolean,
): number | bigint | undefined {
  let best: number | bigint | undefined;
  for (const value of values) {
    if (best === undefined || better(value, best)) best = value;
  }
  return best;
}

function sum(this: IntoIter<number>): number;
function sum(this: IntoIter<bigint>): bigint;
function sum(this: IntoIter<number | bigint>): number | bigint {
  let total: number | bigint = 0;
  for (const value of this) total = add(total, value);
  return total;
}

function product(this: IntoIter<number>): number;
function product(this: IntoIter<bigint>): bigint;
function product(this: IntoIter<number | bigint>): number | bigint {
  let total: number | bigint = 1;
  for (const value of this) total = mul(total, value);
  return total;
}

function avg(this: IntoIter<number>): number;
function avg(this: IntoIter<bigint>): bigint;
function avg(this: IntoIter<number | bigint>): number | bigint {
  let total: number | bigint = 0;
  let count = 0;
  for (const value of this) {
    total = add(total, value);
    count++;
  }
  if (count === 0) return NaN;
  if (typeof total === "bigint") return total / BigInt(count);
  return total / count;
}

function min(this: IntoIter<number>): number | undefined;
function min(this: IntoIter<bigint>): bigint | undefined;
function min(this: IntoIter<number | bigint>): number | bigint | undefined {
  return pick(this, less);
}

function max(this: IntoIter<number>): number | undefined;
function max(this: IntoIter<bigint>): bigint | undefined;
function max(this: IntoIter<number | bigint>): number | bigint | undefined {
  return pick(this, greater);
}

IntoIter.prototype.sum = sum;
IntoIter.prototype.avg = avg;
IntoIter.prototype.product = product;
IntoIter.prototype.min = min;
IntoIter.prototype.max = max;
