import { createDefaultEsmPreset } from "ts-jest";

const tsJestPreset = createDefaultEsmPreset();

/** @type {import("jest").Config} **/
export default {
  ...tsJestPreset,
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
