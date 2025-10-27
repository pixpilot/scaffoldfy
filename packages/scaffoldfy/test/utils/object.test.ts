import { getNestedProperty, setNestedProperty } from '../../src/utils/object';

describe('set Nested Property', () => {
  it('should set a simple property', () => {
    const obj: Record<string, unknown> = {};
    setNestedProperty(obj, 'name', 'test');
    expect(obj['name']).toBe('test');
  });

  it('should set a nested property', () => {
    const obj: Record<string, unknown> = {};
    setNestedProperty(obj, 'user.name', 'John');
    expect(obj).toEqual({
      user: {
        name: 'John',
      },
    });
  });

  it('should set a deeply nested property', () => {
    const obj: Record<string, unknown> = {};
    setNestedProperty(obj, 'user.profile.name', 'Jane');
    expect(obj).toEqual({
      user: {
        profile: {
          name: 'Jane',
        },
      },
    });
  });

  it('should override existing values', () => {
    const obj: Record<string, unknown> = {
      user: { name: 'Old' },
    };
    setNestedProperty(obj, 'user.name', 'New');
    expect(obj['user']).toEqual({ name: 'New' });
  });

  it('should handle mixed existing and new paths', () => {
    const obj: Record<string, unknown> = {
      user: { name: 'John' },
    };
    setNestedProperty(obj, 'user.age', 30);
    expect(obj['user']).toEqual({ name: 'John', age: 30 });
  });

  it('should create intermediate objects if needed', () => {
    const obj: Record<string, unknown> = {};
    setNestedProperty(obj, 'a.b.c.d', 'value');
    expect(obj).toEqual({
      a: {
        b: {
          c: {
            d: 'value',
          },
        },
      },
    });
  });

  it('should handle setting values of different types', () => {
    const obj: Record<string, unknown> = {};
    setNestedProperty(obj, 'string', 'test');
    setNestedProperty(obj, 'number', 42);
    setNestedProperty(obj, 'boolean', true);
    setNestedProperty(obj, 'array', [1, 2, 3]);

    expect(obj).toEqual({
      string: 'test',
      number: 42,
      boolean: true,
      array: [1, 2, 3],
    });
  });

  it('should handle empty key gracefully', () => {
    const obj: Record<string, unknown> = {};
    setNestedProperty(obj, 'a..b', 'value');
    // Should skip empty keys
    expect(obj).toHaveProperty('a');
  });
});

describe('getNestedProperty', () => {
  it('should get a simple property', () => {
    const obj: Record<string, unknown> = { name: 'test' };
    expect(getNestedProperty(obj, 'name')).toBe('test');
  });

  it('should get a nested property', () => {
    const obj: Record<string, unknown> = {
      user: { name: 'John' },
    };
    expect(getNestedProperty(obj, 'user.name')).toBe('John');
  });

  it('should get a deeply nested property', () => {
    const obj: Record<string, unknown> = {
      user: {
        profile: {
          name: 'Jane',
        },
      },
    };
    expect(getNestedProperty(obj, 'user.profile.name')).toBe('Jane');
  });

  it('should return undefined for non-existent property', () => {
    const obj: Record<string, unknown> = { name: 'test' };
    expect(getNestedProperty(obj, 'age')).toBeUndefined();
  });

  it('should return undefined for non-existent nested property', () => {
    const obj: Record<string, unknown> = {
      user: { name: 'John' },
    };
    expect(getNestedProperty(obj, 'user.age')).toBeUndefined();
  });

  it('should return undefined when path goes through non-object', () => {
    const obj: Record<string, unknown> = {
      user: 'not an object',
    };
    expect(getNestedProperty(obj, 'user.name')).toBeUndefined();
  });

  it('should handle empty path', () => {
    const obj: Record<string, unknown> = { name: 'test' };
    expect(getNestedProperty(obj, '')).toBeUndefined();
  });

  it('should handle paths with empty segments', () => {
    const obj: Record<string, unknown> = {
      user: { name: 'John' },
    };
    expect(getNestedProperty(obj, 'user..name')).toBeUndefined();
  });

  it('should return various data types', () => {
    const obj: Record<string, unknown> = {
      string: 'test',
      number: 42,
      boolean: true,
      array: [1, 2, 3],
      object: { nested: 'value' },
    };

    expect(getNestedProperty(obj, 'string')).toBe('test');
    expect(getNestedProperty(obj, 'number')).toBe(42);
    expect(getNestedProperty(obj, 'boolean')).toBe(true);
    expect(getNestedProperty(obj, 'array')).toEqual([1, 2, 3]);
    expect(getNestedProperty(obj, 'object')).toEqual({ nested: 'value' });
    expect(getNestedProperty(obj, 'object.nested')).toBe('value');
  });

  it('should handle null values', () => {
    const obj: Record<string, unknown> = {
      nullValue: null,
      nested: { nullProp: null },
    };

    expect(getNestedProperty(obj, 'nullValue')).toBeNull();
    expect(getNestedProperty(obj, 'nested.nullProp')).toBeNull();
  });
});
