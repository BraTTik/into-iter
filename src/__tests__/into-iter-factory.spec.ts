import { describe, it, expect } from "@jest/globals";
import { intoIter } from "../into-iter-factory";
import { IntoIter } from "../into-iter";

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
  });
});
