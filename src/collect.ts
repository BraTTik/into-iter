import { IntoIter } from "./into-iter.js";
import { arrayCollectable, mapCollectable, setCollectable } from "./collect-sinks.js";
import { collector, type Collectable, type Collector } from "./collector.js";

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
