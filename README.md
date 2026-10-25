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
import "into-iter/enumerate";
import "into-iter/filter";
import "into-iter/limit";
import "into-iter/skip";
import "into-iter/flat-map";
import "into-iter/collect";
import "into-iter/math";

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

### `enumerate()`

Нумерует элементы с нуля. Каждая пара — это индекс и значение. Индекс относится к тому итератору, на котором вызван `enumerate`: после `filter` или `skip` счёт начинается заново. Подключается отдельным импортом `into-iter/enumerate`.

```ts
[...intoIter(["a", "b", "c"]).enumerate()]; // [[0, "a"], [1, "b"], [2, "c"]]
[...intoIter([1, 2, 3, 4]).filter((n) => n % 2 === 0).enumerate()]; // [[0, 2], [1, 4]]
```

`enumerate` всегда считает с нуля в том порядке, в котором читается его источник. Сначала развернуть, потом нумеровать — индексы начинаются с нуля. Сначала нумеровать, потом развернуть — разворачиваются уже готовые пары, и индексы остаются прежними:

```ts
[...intoIter([1, 2, 3, 4]).reversed.enumerate()]; // [[0, 4], [1, 3], [2, 2], [3, 1]]
[...intoIter([1, 2, 3, 4]).enumerate().reversed]; // [[3, 4], [2, 3], [1, 2], [0, 1]]
```

Повторное чтение начинает нумерацию с нуля. Для `enumerate().reversed` нужна длина. После `filter` её нет, поэтому такая цепочка выбрасывает `Cannot walk backwards`.

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

### `skip(count)`

Пропускает первые `count` элементов. Дальше источник читается как обычно, в том числе бесконечный генератор, если после `skip` стоит `limit`:

```ts
[...intoIter(10).skip(3)]; // [3, 4, 5, 6, 7, 8, 9]
[...intoIter([1, 2, 3]).skip(0)]; // [1, 2, 3]
[...intoIter([1, 2, 3]).skip(10)]; // []
```

`count` должен быть неотрицательным целым числом, иначе `skip` выбрасывает `TypeError`. Ноль элементов пропускать можно.

Несколько `skip` подряд складываются: `skip(2).skip(3)` пропускает пять элементов.

### `flatMap(fn)`

Вызывает `fn` для каждого элемента и склеивает последовательности, которые она вернула. `fn` должна вернуть `Iterable`: массив, строку, `Set`, `Map`, генератор или другой `IntoIter`. Одно значение передаётся массивом из одного элемента, `[value]`. Число, объект и `null` вызывают `TypeError` при чтении.

```ts
[...intoIter([1, 2, 3]).flatMap((n) => [n, n * 10])]; // [1, 10, 2, 20, 3, 30]
[...intoIter(["foo bar", "baz"]).flatMap((line) => line.split(" "))]; // ["foo", "bar", "baz"]
```

Пустая последовательность выпадает из результата. Строка разбирается на символы, `Set` отдаёт значения, `Map` отдаёт пары `[key, value]`:

```ts
[...intoIter([1, 2, 3]).flatMap((n) => (n === 2 ? [n] : []))]; // [2]
[...intoIter([1]).flatMap(() => "ab")]; // ["a", "b"]
[...intoIter(["a", "b"]).flatMap((key) => new Map([[key, key.length]]))]; // [["a", 1], ["b", 1]]
```

`fn` вызывается, только когда нужна следующая последовательность. Длины у результата нет: сколько элементов вернёт `fn`, заранее неизвестно.

### `flatten()`

Склеивает один уровень вложенности. Это `flatMap`, который подставляет сам элемент как последовательность. Элемент должен быть `Iterable`, иначе при чтении будет `TypeError`.

```ts
[...intoIter([
  [1, 2],
  [3, 4],
]).flatten()]; // [1, 2, 3, 4]

[...intoIter([[1], [], [2, 3]]).flatten()]; // [1, 2, 3]
```

Глубже одного уровня `flatten` не заглядывает. Следующий уровень снимает ещё один вызов:

```ts
[...intoIter([[[1, 2]], [[3]]]).flatten()]; // [[1, 2], [3]]
[...intoIter([[[1, 2]], [[3]]]).flatten().flatten()]; // [1, 2, 3]
```

Строка, `Set` и `Map` тоже последовательности: `"ab"` развернётся в `"a"`, `"b"`. `flatten` и `filterMap` подключаются тем же импортом, что и `flatMap`: `into-iter/flat-map`.

### `filterMap(fn)`

За один проход преобразует элемент и решает, оставлять ли его. `fn` возвращает новое значение или `undefined`, чтобы пропустить исходный элемент. `null` тоже пропускается. Ноль, `false` и пустая строка остаются:

```ts
[...intoIter(["1", "x", "2"]).filterMap((s) => {
  const n = Number(s);
  return Number.isNaN(n) ? undefined : n;
})]; // [1, 2]

[...intoIter([0, false, "", 1]).filterMap((value) => value)]; // [0, false, "", 1]
```

Возвращённый массив приходит как один элемент и дальше не разворачивается. Длины у результата нет, поэтому `filterMap(...).limit(n).reversed` выбрасывает `Cannot walk backwards`. `filterMap(...).reversed` читает оставленные значения с конца:

```ts
[...intoIter([1, 2, 3, 4, 5]).filterMap((n) => (n % 2 === 0 ? n * 10 : undefined)).reversed]; // [40, 20]
```

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

`reversed.limit(n)` работает с любой цепочкой, которая читается с конца. Для `limit(n).reversed` нужно ещё знать длину, чтобы найти `n`-й элемент. Длину знают массивы, строки, typed array и диапазоны, а `map`, `enumerate`, `limit`, `skip` и `reversed` её сохраняют. После `filter`, `flatMap`, `flatten` и `filterMap` длина неизвестна, поэтому такая цепочка выбрасывает `Cannot walk backwards`:

```ts
[...intoIter(20).filter((n) => n % 7 === 0).reversed.limit(2)]; // [14, 7]
[...intoIter(20).filter((n) => n % 7 === 0).limit(2).reversed]; // Error: Cannot walk backwards
[...intoIter([[1], [2, 3, 4]]).flatten().limit(2).reversed]; // Error: Cannot walk backwards
```

`skip` вместе с `reversed` тоже зависит от порядка. `skip(n).reversed` читает хвост с конца, `reversed.skip(n)` выбрасывает последние `n` элементов:

```ts
[...intoIter(10).skip(3).reversed]; // [9, 8, 7, 6, 5, 4, 3]
[...intoIter(10).reversed.skip(3)]; // [6, 5, 4, 3, 2, 1, 0]
```

`flatMap(...).reversed` и `flatten().reversed` читают внешние последовательности с конца, а каждую внутреннюю тоже с конца. Внутренняя последовательность должна уметь так читаться. `Set` и `Map` внутри выбрасывают `Cannot walk backwards`:

```ts
[...intoIter([
  [1, 2],
  [3, 4],
]).flatten().reversed]; // [4, 3, 2, 1]

[...intoIter([1, 2]).flatMap((n) => new Set([n])).reversed]; // Error: Cannot walk backwards
```

## Сборка результата

`collect`, `toArray`, `toSet` и `toMap` читают цепочку сразу. До их вызова она остаётся ленивой. Подключаются импортом `into-iter/collect`.

### `collect(target)`

Заполняет переданную коллекцию. Для массива, `Set` и `Map` возвращает её же.

```ts
const numbers = intoIter([1, 2, 3]).map((n) => n * 10);

numbers.collect([]); // [10, 20, 30]
numbers.collect(new Set()); // Set { 10, 20, 30 }
intoIter([
  ["a", 1],
  ["b", 2],
] as [string, number][]).collect(new Map()); // Map { "a" => 1, "b" => 2 }
```

В массив элементы добавляются через `push`, в `Set` через `add`. В `Map` попадают пары `[key, value]`: повторный ключ перезаписывает значение. Уже лежащие в коллекции элементы не стираются.

Свой тип подключается символом `collector`. Его метод возвращает объект с `add` и `finish`. `collect` вызывает `finish` один раз после всех элементов и возвращает его результат:

```ts
import { collector, type Collector } from "into-iter/collect";

const joined = {
  [collector](): Collector<number, string> {
    const items: number[] = [];
    return {
      add(value) {
        items.push(value);
      },
      finish() {
        return items.join(",");
      },
    };
  },
};

intoIter([1, 2, 3]).collect(joined); // "1,2,3"
```

### `toArray()`, `toSet()`, `toMap()`

Короткие вызовы `collect` с новой пустой коллекцией. `toMap` доступен, когда элементы — пары `[key, value]`.

```ts
intoIter([1, 2, 2, 3]).toArray(); // [1, 2, 2, 3]
intoIter([1, 2, 2, 3]).toSet(); // Set { 1, 2, 3 }
intoIter([["a", 1], ["b", 2]] as [string, number][]).toMap(); // Map { "a" => 1, "b" => 2 }
```

## Числовые агрегаты

`sum`, `product`, `avg`, `min` и `max` читают цепочку сразу. До их вызова она остаётся ленивой. Подключаются импортом `into-iter/math`. Методы есть у последовательности чисел и у последовательности `bigint`. Смешивать эти типы в одной последовательности нельзя.

```ts
const numbers = intoIter([1, 2, 3, 4]);

numbers.sum(); // 10
numbers.product(); // 24
numbers.avg(); // 2.5
numbers.min(); // 1
numbers.max(); // 4
```

Пустая числовая последовательность: `sum` возвращает `0`, `product` — `1`, `avg` — `NaN`, `min` и `max` — `undefined`.

`bigint` считается отдельно. `avg` делит нацело, к нулю:

```ts
intoIter([1n, 2n, 3n]).sum(); // 6n
intoIter([1n, 2n, 3n]).product(); // 6n
intoIter([1n, 2n, 3n]).avg(); // 2n
intoIter([1n, 2n]).avg(); // 1n
intoIter([3n, 1n, 2n]).min(); // 1n
intoIter([3n, 1n, 2n]).max(); // 3n
```

Пустой `bigint`-итератор в рантайме не отличить от пустого числового, поэтому `sum` и `product` на нём возвращают `0` и `1`, а `avg` — `NaN`. `min` и `max` и здесь возвращают `undefined`.
