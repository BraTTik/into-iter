import { IntoIter } from "./into-iter.js";

export const collector = Symbol("collector.into-iter");

export interface Collector<T, R> {
  add(value: T): void;
  finish(): R;
}

export interface Collectable<T, R> {
  [collector](): Collector<T, R>;
}

declare module "./into-iter.js" {
  interface IntoIter<T> {
    collect(this: IntoIter<T>, collector: Array<T>): Array<T>;
    collect<K, V>(this: IntoIter<[K, V]>, collector: Map<K, V>): Map<K, V>;
    collect(this: IntoIter<T>, collector: Set<T>): Set<T>;
    collect<R>(this: IntoIter<T>, collector: Collectable<T, R>): R;

    toArray(): Array<T>;
    toMap<K, V>(this: IntoIter<[K, V]>): Map<K, V>;
    toSet(): Set<T>;
  }
}

const arrayCollectable = <T>(arr: T[]): Collector<T, T[]> => ({
  add: (value) => {
    arr.push(value);
  },
  finish: () => arr,
});
const mapCollectable = <K, V>(map: Map<K, V>): Collector<[K, V], Map<K, V>> => ({
  add: ([key, value]) => map.set(key, value),
  finish: () => map,
});

const setCollectable = <T>(set: Set<T>): Collector<T, Set<T>> => ({
  add: (value) => set.add(value),
  finish: () => set,
});

function collect<T>(this: IntoIter<T>, collector: Array<T>): Array<T>;
function collect<K, V>(this: IntoIter<[K, V]>, collector: Map<K, V>): Map<K, V>;
function collect<T>(this: IntoIter<T>, collector: Set<T>): Set<T>;
function collect<T, R>(this: IntoIter<T>, collector: Collectable<T, R>): R;
function collect<T>(
  this: IntoIter<T>,
  target: T[] | Set<T> | Map<unknown, unknown> | Collectable<T, unknown>,
): T[] | Set<T> | Map<unknown, unknown> | unknown {
  const sink: Collector<T, unknown> = Array.isArray(target)
    ? arrayCollectable(target)
    : target instanceof Set
      ? setCollectable(target)
      : target instanceof Map
        ? (mapCollectable(target) as Collector<T, unknown>)
        : target[collector]();
  for (const val of this) sink.add(val);

  return sink.finish();
}

IntoIter.prototype.collect = collect;
IntoIter.prototype.toArray = function toArray() {
  return this.collect([]);
};
IntoIter.prototype.toMap = function <K, V>(this: IntoIter<[K, V]>) {
  return this.collect(new Map());
};
IntoIter.prototype.toSet = function toSet() {
  return this.collect(new Set());
};
