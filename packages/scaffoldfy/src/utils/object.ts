/**
 * Set a nested property in an object using dot notation
 */
export function setNestedProperty(
  obj: Record<string, unknown>,
  propertyPath: string,
  value: unknown,
): void {
  const keys = propertyPath.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (key != null && key !== '') {
      if (
        !(key in current) ||
        typeof current[key] !== 'object' ||
        current[key] === null
      ) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }
  }

  const lastKey = keys[keys.length - 1];
  if (lastKey != null && lastKey !== '') {
    current[lastKey] = value;
  }
}

/**
 * Get a nested property from an object using dot notation
 */
export function getNestedProperty(
  obj: Record<string, unknown>,
  propertyPath: string,
): unknown {
  const keys = propertyPath.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (key !== '' && typeof current === 'object' && current !== null) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return current;
}
