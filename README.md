# into-iter

Ленивые адаптеры для любых iterable. Цепочка не обходит источник, пока её не начинают читать, и один и тот же результат можно прочитать повторно. Для источников, которые умеют читаться с обоих концов, `reversed` идёт с конца без копирования.

Пакет собран как ES-модули и рассчитан на Node.js 22+.

## Установка

```sh
npm install into-iter
```

## Подключение методов

Основной вход отдаёт `intoIter` без методов. Каждый метод подключается отдельным импортом и не попадает в сборку, пока этот импорт не написан:

```ts
import { intoIter } from "into-iter";
import "into-iter/map";
import "into-iter/filter";
import "into-iter/limit";

const values = intoIter([1, 2, 3, 4])
  .map((n) => n * 2)
  .filter((n) => n > 4);

console.log([...values]); // [6, 8]
console.log([...values]); // [6, 8]
```

`reversed` есть всегда, отдельный импорт ему не нужен.

## Источники

`intoIter` принимает любой iterable или диапазон:

```ts
[...intoIter([1, 2, 3])]; // [1, 2, 3]
[...intoIter("abc")]; // ["a", "b", "c"]
[...intoIter(new Set([1, 2]))]; // [1, 2]

[...intoIter(4)]; // [0, 1, 2, 3]
[...intoIter({ start: 1, end: 8, step: 2 })]; // [1, 3, 5, 7]
```

Диапазон не включает `end`. Если `start >= end`, он пустой.

Массивы, строки, typed array и диапазоны читаются с обоих концов. Остальные iterable (`Set`, `Map`, генераторы) читаются только вперёд.

## Методы

### `map(fn)`

Применяет `fn` к каждому элементу. `fn` вызывается только для прочитанных элементов.

```ts
[...intoIter([1, 2, 3]).map((n) => n * 10)]; // [10, 20, 30]
```

### `filter(predicate)`

Оставляет элементы, для которых `predicate` вернул `true`.

```ts
[...intoIter(10).filter((n) => n % 3 === 0)]; // [0, 3, 6, 9]
```

### `limit(count)`

Берёт первые `count` элементов и дальше источник не читает, поэтому работает и с бесконечными генераторами:

```ts
[...intoIter(10).limit(3)]; // [0, 1, 2]
[...intoIter([1, 2]).limit(5)]; // [1, 2]
[...intoIter([1, 2]).limit(0)]; // []
```

`count` должен быть неотрицательным целым числом, иначе `limit` выбрасывает `TypeError`.

### `reversed`

Геттер, который возвращает ту же цепочку, читаемую с конца. Исходная цепочка не меняется, а двойной `reversed` возвращает исходный порядок.

```ts
const source = intoIter([1, 2, 3]);

[...source.reversed]; // [3, 2, 1]
[...source]; // [1, 2, 3]
[...source.reversed.reversed]; // [1, 2, 3]
```

Разворот ничего не копирует. Первый элемент перевёрнутого диапазона из миллиона чисел вычисляется сразу:

```ts
intoIter(1_000_000).map((n) => n * n).reversed[Symbol.iterator]().next(); // { done: false, value: 999998000001 }
```

`map` и `filter` сохраняют возможность чтения с конца, поэтому `reversed` можно ставить в любом месте цепочки:

```ts
[...intoIter(10).filter((n) => n % 3 === 0).reversed]; // [9, 6, 3, 0]
[...intoIter([1, 2, 3]).reversed.map((n) => n * 10)]; // [30, 20, 10]
```

Если источник читается только вперёд, `reversed` выбрасывает `Error("Cannot walk backwards")`. Ошибка возникает при чтении, а не при вызове геттера:

```ts
const iter = intoIter(new Set([1, 2, 3])).reversed; // ошибки нет
[...iter]; // Error: Cannot walk backwards
```

### `limit` и `reversed` вместе

Результат зависит от порядка:

```ts
[...intoIter(10).limit(3).reversed]; // [2, 1, 0] — первые 3, с конца
[...intoIter(10).reversed.limit(3)]; // [9, 8, 7] — последние 3
```

`reversed.limit(n)` работает с любой цепочкой, которая читается с конца. Для `limit(n).reversed` нужно ещё знать длину, чтобы найти `n`-й элемент. Длину знают массивы, строки, typed array и диапазоны, а `map`, `limit` и `reversed` её сохраняют. После `filter` длина неизвестна, поэтому такая цепочка выбрасывает `Cannot walk backwards`:

```ts
[...intoIter(20).filter((n) => n % 7 === 0).reversed.limit(2)]; // [14, 7]
[...intoIter(20).filter((n) => n % 7 === 0).limit(2).reversed]; // Error: Cannot walk backwards
```
