import { AsyncIntoIter } from "../async-into-iter.js";
import { arrayCollectable, mapCollectable, setCollectable } from "../collect-sinks.js";
import { collector, type Collectable, type Collector } from "../collector.js";

declare module "../async-into-iter.js" {
  interface AsyncIntoIter<T> {
    collect(this: AsyncIntoIter<T>, collector: Array<T>): Promise<Array<T>>;
    collect<K, V>(this: AsyncIntoIter<[K, V]>, collector: Map<K, V>): Promise<Map<K, V>>;
    collect(this: AsyncIntoIter<T>, collector: Set<T>): Promise<Set<T>>;
    collect<R>(this: AsyncIntoIter<T>, collector: Collectable<T, R>): Promise<R>;

    toArray(): Promise<Array<T>>;
    toMap<K, V>(this: AsyncIntoIter<[K, V]>): Promise<Map<K, V>>;
    toSet(): Promise<Set<T>>;
  }
}

async function collect<T>(this: AsyncIntoIter<T>, collector: Array<T>): Promise<Array<T>>;
async function collect<K, V>(this: AsyncIntoIter<[K, V]>, collector: Map<K, V>): Promise<Map<K, V>>;
async function collect<T>(this: AsyncIntoIter<T>, collector: Set<T>): Promise<Set<T>>;
async function collect<T, R>(this: AsyncIntoIter<T>, collector: Collectable<T, R>): Promise<R>;
async function collect<T>(
  this: AsyncIntoIter<T>,
  target: T[] | Set<T> | Map<unknown, unknown> | Collectable<T, unknown>,
): Promise<T[] | Set<T> | Map<unknown, unknown> | unknown> {
  const sink: Collector<T, unknown> = Array.isArray(target)
    ? arrayCollectable(target)
    : target instanceof Set
      ? setCollectable(target)
      : target instanceof Map
        ? (mapCollectable(target) as Collector<T, unknown>)
        : target[collector]();
  for await (const value of this) sink.add(value);

  return sink.finish();
}

AsyncIntoIter.prototype.collect = collect;
AsyncIntoIter.prototype.toArray = function toArray() {
  return this.collect([]);
};
AsyncIntoIter.prototype.toMap = function <K, V>(this: AsyncIntoIter<[K, V]>) {
  return this.collect(new Map());
};
AsyncIntoIter.prototype.toSet = function toSet() {
  return this.collect(new Set());
};
