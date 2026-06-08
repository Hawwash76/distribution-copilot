/** Type guard that narrows out `null` and `undefined`. */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/** Exhaustiveness helper for `switch` statements over union types. */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}

export * from "./scoring";
