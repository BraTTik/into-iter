import { intoIter } from "../src/into-iter-factory.js";
import "../src/filter.js";
import "../src/map.js";
import "../src/limit.js";
import "../src/flat-map.js";

function add2(num: number): number {
  return num + 2;
}

const test = intoIter(10);

const addIter = test.map(add2).map(add2);
const nextIter = test.map(add2).limit(2).reversed;

const flatMapIter = intoIter([1, 2, 3, 4]).limit(2);

const flat = intoIter([[1], [2, 3, 4]])
  .flatten()
  .limit(2).reversed;

console.log(...flat);

console.log([...flatMapIter]);
console.log([...flatMapIter.reversed]);

const stringIter = intoIter("abc").reversed.reversed.reversed;

const arr = [1, 2, 3];

const arrIter = arr[Symbol.iterator]();
const nextArrIter = arr[Symbol.iterator]();

console.log(arrIter.next());
console.log(nextArrIter.next());

console.log(...addIter);
console.log(...addIter);
console.log(...nextIter);

console.log(...stringIter);
