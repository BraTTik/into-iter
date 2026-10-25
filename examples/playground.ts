import { intoIter } from "../src/into-iter-factory.js";
import "../src/filter.js";
import "../src/map.js";
import "../src/limit.js";
import "../src/flat-map.js";
import "../src/collect.js";
import "../src/enumerate.js";

function add2(num: number): number {
  return num + 2;
}

const test = intoIter(10);

const addIter = test.map(add2).map(add2);
const nextIter = test.map(add2).limit(2).reversed;

const flatMapIter = intoIter([1, 2, 3, 4]).limit(2);

const flat = intoIter([1, 2, 3, 4]).filterMap((val) => (val % 2 === 0 ? (val * 2).toString(2) : undefined));

console.log(...flat);

console.log(flatMapIter.enumerate().toMap());

const stringIter = intoIter("abc").reversed.reversed.reversed;

const arr = [1, 2, 3];

const arrIter = arr[Symbol.iterator]();
const nextArrIter = arr[Symbol.iterator]();
