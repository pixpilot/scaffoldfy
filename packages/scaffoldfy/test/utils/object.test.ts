import { setNestedProperty } from '../../src/utils/object';

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
