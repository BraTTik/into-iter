export function bound<F extends (...args: never[]) => unknown>(target: object, fn?: F | undefined) {
  return fn?.bind(target) as F | undefined;
}

export function isNotRangeNumber(num: number): boolean {
  return isNaN(num) || num < 0 || !Number.isInteger(num);
}
