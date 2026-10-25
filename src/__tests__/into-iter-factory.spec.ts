import { describe, it, expect } from "@jest/globals";
import { intoIter } from "../into-iter-factory.js";
import { IntoIter } from "../into-iter.js";
import { AsyncIntoIter } from "../async-into-iter.js";

describe("intoIterFactory", () => {
  describe("constructor", () => {
    it("creates from range number", () => {
      expect(intoIter(1000) instanceof IntoIter).toBeTruthy();
    });

    it("creates from range options", () => {
      expect(intoIter({ start: 2, end: 10, step: 2 }) instanceof IntoIter).toBeTruthy();
    });

    it("creates from iterable", () => {
      expect(intoIter("iterableString") instanceof IntoIter).toBe(true);
      expect(intoIter([1, 2, 3]) instanceof IntoIter).toBe(true);
      expect(intoIter(new Set([1, 2, 3])) instanceof IntoIter).toBe(true);
      expect(
        intoIter(
          new Map([
            ["foo", 1],
            ["bar", 2],
          ]),
        ) instanceof IntoIter,
      ).toBe(true);
      expect(intoIter(Iterator.from({ next: () => ({ done: true, value: undefined }) })) instanceof IntoIter).toBe(
        true,
      );
    });

    it("creates AsyncIntoIter from an async iterable", () => {
      async function* values() {
        yield 1;
      }

      expect(intoIter(values()) instanceof AsyncIntoIter).toBe(true);
    });

    it("prefers the async cursor when both symbols exist", () => {
      const both = {
        *[Symbol.iterator]() {
          yield "sync";
        },
        async *[Symbol.asyncIterator]() {
          yield "async";
        },
      };

      expect(intoIter(both) instanceof AsyncIntoIter).toBe(true);
    });

    it("keeps a range synchronous even if it also has an async iterator", () => {
      const range = {
        start: 0,
        end: 2,
        step: 1,
        async *[Symbol.asyncIterator]() {
          yield 9;
        },
      };

      expect(intoIter(range) instanceof IntoIter).toBe(true);
    });
  });
});
