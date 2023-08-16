/**
 * Helper function to assert a condition is truthy
 * @param x - A boolean condition to assert.
 * @param err - Error message to throw if x isn't met.
 */
export function assert(x: any, err: string): asserts x {
  if (!x) {
    throw new Error(err);
  }
}

/**
 * Checks if an object has a specific property as its own (not inherited).
 *
 * @param obj - The object to check.
 * @param prop - The property name to check for.
 * @returns True if the object has the property, false otherwise.
 */
export function hasOwnProperty(obj: object, prop: string) {
  // Ensure that obj is an object and has the hasOwnProperty method.
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
