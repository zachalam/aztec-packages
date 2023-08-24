/**
 * An interrupt has occurred.
 */
export class InterruptError extends Error {}

/**
 * An assumption check has failed.
 */
export class AssertionError extends Error {}

/**
 * Helper function to assert a condition is truthy.
 * @param x - A boolean condition to assert.
 * @param err - Error message to throw if x isn't met.
 * @throws AssertionError if failed.
 */
export function assert(x: any, err: string): asserts x {
  if (!x) {
    throw new AssertionError(err);
  }
}
