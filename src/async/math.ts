import { AsyncIntoIter } from "../async-into-iter.js";

type NumMethod<T> = [T] extends [number] ? () => Promise<number> : [T] extends [bigint] ? () => Promise<bigint> : never;
type MaybeNumMethod<T> = [T] extends [number]
  ? () => Promise<number | undefined>
  : [T] extends [bigint]
    ? () => Promise<bigint | undefined>
    : never;

declare module "../async-into-iter.js" {
  interface AsyncIntoIter<T> {
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

async function pick(
  values: AsyncIntoIter<number | bigint>,
  better: (candidate: number | bigint, current: number | bigint) => boolean,
): Promise<number | bigint | undefined> {
  let best: number | bigint | undefined;
  for await (const value of values) {
    if (best === undefined || better(value, best)) best = value;
  }
  return best;
}

async function sum(this: AsyncIntoIter<number>): Promise<number>;
async function sum(this: AsyncIntoIter<bigint>): Promise<bigint>;
async function sum(this: AsyncIntoIter<number | bigint>): Promise<number | bigint> {
  let total: number | bigint = 0;
  for await (const value of this) total = add(total, value);
  return total;
}

async function product(this: AsyncIntoIter<number>): Promise<number>;
async function product(this: AsyncIntoIter<bigint>): Promise<bigint>;
async function product(this: AsyncIntoIter<number | bigint>): Promise<number | bigint> {
  let total: number | bigint = 1;
  for await (const value of this) total = mul(total, value);
  return total;
}

async function avg(this: AsyncIntoIter<number>): Promise<number>;
async function avg(this: AsyncIntoIter<bigint>): Promise<bigint>;
async function avg(this: AsyncIntoIter<number | bigint>): Promise<number | bigint> {
  let total: number | bigint = 0;
  let count = 0;
  for await (const value of this) {
    total = add(total, value);
    count += 1;
  }
  if (count === 0) return NaN;
  if (typeof total === "bigint") return total / BigInt(count);
  return total / count;
}

async function min(this: AsyncIntoIter<number>): Promise<number | undefined>;
async function min(this: AsyncIntoIter<bigint>): Promise<bigint | undefined>;
async function min(this: AsyncIntoIter<number | bigint>): Promise<number | bigint | undefined> {
  return pick(this, less);
}

async function max(this: AsyncIntoIter<number>): Promise<number | undefined>;
async function max(this: AsyncIntoIter<bigint>): Promise<bigint | undefined>;
async function max(this: AsyncIntoIter<number | bigint>): Promise<number | bigint | undefined> {
  return pick(this, greater);
}

AsyncIntoIter.prototype.sum = sum;
AsyncIntoIter.prototype.avg = avg;
AsyncIntoIter.prototype.product = product;
AsyncIntoIter.prototype.min = min;
AsyncIntoIter.prototype.max = max;
