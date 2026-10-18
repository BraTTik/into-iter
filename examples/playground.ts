import { intoIter } from "../src/into-iter-factory.js";
import "../src/filter.js";

function add2(num: number): number {
  return num + 2;
}

const test = intoIter(10);

const addIter = test.map(add2).map(add2).map(add2);
const nextIter = test.map(add2).filter((p) => p % 2 === 0);

const arr = [1, 2, 3];

const arrIter = arr[Symbol.iterator]();
const nextArrIter = arr[Symbol.iterator]();

console.log(arrIter.next());
console.log(nextArrIter.next());

console.log(...addIter);
console.log(...addIter);
console.log(...nextIter);
