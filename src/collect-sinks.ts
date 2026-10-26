import { type Collector } from "./collector.js";

export const arrayCollectable = <T>(arr: T[]): Collector<T, T[]> => ({
  add: (value) => {
    arr.push(value);
  },
  finish: () => arr,
});

export const mapCollectable = <K, V>(map: Map<K, V>): Collector<[K, V], Map<K, V>> => ({
  add: ([key, value]) => map.set(key, value),
  finish: () => map,
});

export const setCollectable = <T>(set: Set<T>): Collector<T, Set<T>> => ({
  add: (value) => set.add(value),
  finish: () => set,
});
