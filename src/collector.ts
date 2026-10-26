export const collector = Symbol("collector.into-iter");

export interface Collector<T, R> {
  add(value: T): void;
  finish(): R;
}

export interface Collectable<T, R> {
  [collector](): Collector<T, R>;
}
