# План методов intoIter

Ленивые адаптеры возвращают `IntoIter`. Агрегаторы поглощают итератор и возвращают значение. Для `reversed` после адаптера важно, сохраняет ли он `nextBack`.

Уже было до этого плана: `map`, `filter`, `reversed`.

## Адаптеры

- [x] `limit(n)` — Rust `take`. Сохраняет `nextBack`, если известна длина
- [x] `skip(n)` — Rust `skip` (в плане ещё `from`). Сохраняет `nextBack`, если известна длина
- [x] `flatMap(fn)` — Rust `flat_map`. Сохраняет `nextBack`, если вложенные последовательности двусторонние
- [x] `flatten()` — Rust `flatten`. То же, что `flatMap`
- [x] `filterMap(fn)` — Rust `filter_map`. Сохраняет `nextBack`
- [ ] `enumerate()` — Rust `enumerate`. Сохраняет `nextBack`, если известна длина
- [ ] `zip(other)` — Rust `zip`. Сохраняет `nextBack`, если длина известна у обоих
- [ ] `chain(other)` — Rust `chain`. Сохраняет `nextBack`, если оба двусторонние
- [ ] `stepBy(n)` — Rust `step_by`. Сохраняет `nextBack`, если известна длина
- [ ] `inspect(fn)` — Rust `inspect`. Сохраняет `nextBack`
- [ ] `takeWhile(fn)` — Rust `take_while`. Не сохраняет `nextBack`
- [ ] `skipWhile(fn)` — Rust `skip_while`. Не сохраняет `nextBack`
- [ ] `mapWhile(fn)` — Rust `map_while`. Не сохраняет `nextBack`
- [ ] `scan(init, fn)` — Rust `scan`. Не сохраняет `nextBack`: состояние накапливается слева направо
- [ ] `chunks(n)` — Rust `chunks` у срезов. С конца нужна длина
- [ ] `windows(n)` — Rust `windows` у срезов. С конца нужна длина
- [ ] `cycle()` — Rust `cycle`. Не сохраняет `nextBack`: последовательность бесконечная

Из задания обязательны `limit`, `skip` и `flatMap`. Сразу после них стоит сделать `enumerate`, `zip`, `chain` и `takeWhile`.

## Агрегаторы

Агрегаторам нужен только `next`. `last`, `findLast` и `nthBack` используют `nextBack`, если он есть, иначе обходят последовательность с начала.

- [ ] `sum()` — Rust `sum`. Только для `number` и `bigint`
- [ ] `product()` — Rust `product`. Только для `number` и `bigint`
- [ ] `avg()` — в Rust нет, нужен по заданию. Для пустой последовательности решить: `NaN` или `undefined`
- [ ] `count()` — Rust `count`. Если известна длина, ответ мгновенный
- [ ] `min()` — Rust `min`
- [ ] `max()` — Rust `max`
- [ ] `minBy(fn)` — Rust `min_by_key`
- [ ] `maxBy(fn)` — Rust `max_by`
- [ ] `reduce(fn)` — Rust `reduce`
- [ ] `fold(init, fn)` — Rust `fold`
- [ ] `every(fn)` — Rust `all`. Останавливается на первом неподходящем элементе
- [ ] `some(fn)` — Rust `any`. Останавливается на первом подходящем элементе
- [ ] `find(fn)` — Rust `find`
- [ ] `findMap(fn)` — Rust `find_map`
- [ ] `position(fn)` — Rust `position`
- [ ] `first()` — Rust `next`
- [ ] `last()` — Rust `last`. При наличии `nextBack` — за одну операцию
- [ ] `nth(n)` — Rust `nth`
- [ ] `nthBack(n)` — Rust `nth_back`
- [ ] `findLast(fn)` — Rust `rfind`. Идёт с конца
- [ ] `foldRight(init, fn)` — Rust `rfold`. Идёт с конца
- [ ] `forEach(fn)` — Rust `for_each`
- [ ] `partition(fn)` — Rust `partition`. Возвращает пару массивов
- [ ] `join(sep)` — `join` в itertools. Для строк

## Сборка результата

Расширяемый `collect`, по аналогии с трейтом `FromIterator` в Rust: своя коллекция подключается через символ, без правок библиотеки.

```ts
export const collector = Symbol("into-iter.collector");

export interface Collector<T, R> {
  add(value: T): void;
  finish(): R;
}

export interface Collectable<T, R> {
  [collector](): Collector<T, R>;
}
```

- [ ] `collect(target)` — `[]` через `push`, `Set` через `add`, `Map` через `set` для пар `[key, value]`, `""` склеивает строку, объект с `[collector]` через `add` и `finish`
- [ ] `toArray()`
- [ ] `toSet()`
- [ ] `toMap()`
- [ ] `groupBy(fn)` — аналог `into_group_map` из itertools
- [ ] `unzip()`

Методы по-прежнему добавляются в прототип отдельными модулями, как `map` и `filter`.

## Асинхронные источники

Прямого аналога в стандартной библиотеке Rust нет, ближайшее — `Stream` из `futures`.

- [ ] `AsyncIntoIter` с курсором `next(): Promise<IteratorResult<T>>`
- [ ] Асинхронные `map`, `filter`, `limit`, `skip`, `flatMap`, агрегаторы и `collect`. Все возвращают `Promise`, функции в `map` и `filter` тоже могут быть асинхронными
- [ ] Общая логика адаптеров в функциях над курсором (`mapCursor`, `filterCursor`), чтобы синхронный и асинхронный классы различались только ожиданием `next`

`reversed` для асинхронных источников не делаем: почти нет структур, которые умеют читаться с конца асинхронно.

## Порядок

- [x] `remaining` на курсоре
- [x] `limit` и `skip`
- [ ] `flatMap`
- [ ] `collect` с протоколом сборки и `toArray`
- [ ] `sum`, `avg`, `count`, `min`, `max`, `reduce`, `every`, `some`, `find`, `first`, `last`
- [ ] `enumerate`, `zip`, `chain`, `takeWhile`, `skipWhile`
- [ ] `AsyncIntoIter`
