# into-iter

Ленивые адаптеры для любых iterable. Цепочка не обходит источник, пока её не начинают читать, и один и тот же результат можно прочитать повторно.

Пакет собран как ES-модули и рассчитан на Node.js 22+.

## Установка

```sh
npm install into-iter
```

## Использование

`map` входит в основной вход. `filter` подключается отдельно и не попадает в сборку, пока этот импорт не написан.

```ts
import { intoIter } from "into-iter";
import "into-iter/filter";

const values = intoIter([1, 2, 3, 4])
  .map((n) => n * 2)
  .filter((n) => n > 4);

console.log([...values]); // [6, 8]
console.log([...values]); // [6, 8]
```

Диапазон задаётся концом или шагом:

```ts
import { intoIter } from "into-iter";

[...intoIter(4)]; // [0, 1, 2, 3]
[...intoIter({ start: 1, end: 8, step: 2 })]; // [1, 3, 5, 7]
```
