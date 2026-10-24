export function bound<F extends (...args: never[]) => unknown>(target: object, fn?: F | undefined) {
  return fn?.bind(target) as F | undefined;
}
