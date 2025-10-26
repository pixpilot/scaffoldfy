---
layout: default
title: Value Transformers - Scaffoldfy
---

# Value Transformers

Value transformers allow you to transform prompt and variable values before they're used in your configurations. This enables powerful data manipulation and validation workflows.

## Table of Contents

- [Overview](#overview)
- [Built-in Transformers](#built-in-transformers)
- [Transformer Types](#transformer-types)
- [Using Transformers](#using-transformers)
- [Transformer Chains](#transformer-chains)
- [Custom Transformers](#custom-transformers)
- [Examples](#examples)

---

## Overview

Transformers are applied to:

- **Prompts**: Transform user input before storing in variables
- **Variables**: Transform computed values before using in configurations
- **Global Transformers**: Define custom transformers for reuse across your configuration

### Key Features

- **Built-in transformers** for common string operations (case conversion, formatting, cleaning)
- **Regex transformers** for pattern-based replacements
- **Computed transformers** for JavaScript expressions
- **Chain transformers** to apply multiple transformations sequentially
- **Custom transformers** defined globally and reused throughout your configuration

---

## Built-in Transformers

Scaffoldfy provides these built-in transformers:

### `lowercase`

Converts the value to lowercase.

```json
{
  "id": "email",
  "message": "Enter your email",
  "type": "input",
  "transformers": ["lowercase"]
}
```

### `uppercase`

Converts the value to uppercase.

```json
{
  "id": "constantName",
  "message": "Enter constant name",
  "type": "input",
  "transformers": ["uppercase"]
}
```

### `trim`

Removes leading and trailing whitespace.

```json
{
  "id": "username",
  "message": "Enter username",
  "type": "input",
  "transformers": ["trim"]
}
```

### `slugify`

Converts a string to a URL-friendly slug (lowercase, spaces to hyphens, special chars removed).

```json
{
  "id": "projectName",
  "message": "Enter project name",
  "type": "input",
  "transformers": ["slugify"]
}
```

**Example:**

- Input: `"My Awesome Project!"`
- Output: `"my-awesome-project"`

### `capitalize`

Capitalizes the first letter of the string.

```json
{
  "id": "title",
  "message": "Enter title",
  "type": "input",
  "transformers": ["capitalize"]
}
```

**Example:**

- Input: `"hello world"`
- Output: `"Hello world"`

### `titlecase`

Converts the string to title case (capitalizes the first letter of each word).

```json
{
  "id": "headline",
  "message": "Enter headline",
  "type": "input",
  "transformers": ["titlecase"]
}
```

**Example:**

- Input: `"hello world example"`
- Output: `"Hello World Example"`

### `camelcase`

Converts the string to camelCase.

```json
{
  "id": "variableName",
  "message": "Enter variable name",
  "type": "input",
  "transformers": ["camelcase"]
}
```

**Example:**

- Input: `"hello world example"`
- Output: `"helloWorldExample"`

### `pascalcase`

Converts the string to PascalCase.

```json
{
  "id": "className",
  "message": "Enter class name",
  "type": "input",
  "transformers": ["pascalcase"]
}
```

**Example:**

- Input: `"hello world example"`
- Output: `"HelloWorldExample"`

### `snakecase`

Converts the string to snake_case.

```json
{
  "id": "fileName",
  "message": "Enter file name",
  "type": "input",
  "transformers": ["snakecase"]
}
```

**Example:**

- Input: `"Hello World Example"`
- Output: `"hello_world_example"`

### `kebabcase`

Converts the string to kebab-case.

```json
{
  "id": "cssClass",
  "message": "Enter CSS class",
  "type": "input",
  "transformers": ["kebabcase"]
}
```

**Example:**

- Input: `"Hello World Example"`
- Output: `"hello-world-example"`

### `constantcase`

Converts the string to CONSTANT_CASE.

```json
{
  "id": "envVar",
  "message": "Enter environment variable",
  "type": "input",
  "transformers": ["constantcase"]
}
```

**Example:**

- Input: `"hello world example"`
- Output: `"HELLO_WORLD_EXAMPLE"`

### `alphanumeric`

Removes all non-alphanumeric characters from the string.

```json
{
  "id": "cleanId",
  "message": "Enter identifier",
  "type": "input",
  "transformers": ["alphanumeric"]
}
```

**Example:**

- Input: `"Hello@World#123!"`
- Output: `"HelloWorld123"`

### `collapse-spaces`

Collapses multiple consecutive spaces into a single space.

```json
{
  "id": "description",
  "message": "Enter description",
  "type": "input",
  "transformers": ["collapse-spaces"]
}
```

**Example:**

- Input: `"Hello    World   Example"`
- Output: `"Hello World Example"`

### `remove-spaces`

Removes all spaces from the string.

```json
{
  "id": "compactName",
  "message": "Enter compact name",
  "type": "input",
  "transformers": ["remove-spaces"]
}
```

**Example:**

- Input: `"Hello World Example"`
- Output: `"HelloWorldExample"`

### `urlencode`

URL-encodes the string.

```json
{
  "id": "encodedUrl",
  "message": "Enter URL",
  "type": "input",
  "transformers": ["urlencode"]
}
```

**Example:**

- Input: `"Hello World"`
- Output: `"Hello%20World"`

### `dasherize`

Converts the string to dash-separated format (similar to kebab-case but may handle special cases).

```json
{
  "id": "dashedName",
  "message": "Enter dashed name",
  "type": "input",
  "transformers": ["dasherize"]
}
```

**Example:**

- Input: `"HelloWorldExample"`
- Output: `"hello-world-example"`

### `underscore`

Converts the string to underscore-separated format (similar to snake_case but may handle special cases).

```json
{
  "id": "underscoredName",
  "message": "Enter underscored name",
  "type": "input",
  "transformers": ["underscore"]
}
```

**Example:**

- Input: `"HelloWorldExample"`
- Output: `"hello_world_example"`

---

## Transformer Types

### Regex Transformer

Apply regular expression find-and-replace operations.

```json
{
  "type": "regex",
  "pattern": "-",
  "replacement": "_",
  "flags": "g"
}
```

**Properties:**

- `pattern` (string, required): The regex pattern to match
- `replacement` (string, required): The replacement string
- `flags` (string, optional): Regex flags (e.g., "g" for global, "i" for case-insensitive)

**Example:**

```json
{
  "id": "snakeCaseName",
  "value": "{{projectName}}",
  "transformers": [
    {
      "type": "regex",
      "pattern": "-",
      "replacement": "_",
      "flags": "g"
    }
  ]
}
```

### Computed Transformer

Evaluate a JavaScript expression with access to all context variables.

```json
{
  "type": "computed",
  "expression": "projectName.length"
}
```

**Properties:**

- `expression` (string, required): JavaScript expression to evaluate

**Example:**

```json
{
  "id": "nameLength",
  "value": "computed",
  "transformers": [
    {
      "type": "computed",
      "expression": "projectName.length"
    }
  ]
}
```

**Available Context:**
All prompts, variables, and environment variables are available in the expression:

```json
{
  "type": "computed",
  "expression": "projectName.toUpperCase() + '_' + version"
}
```

---

## Using Transformers

### On Prompts

Transform user input before storing:

```json
{
  "prompts": [
    {
      "id": "projectName",
      "message": "What is the project name?",
      "type": "input",
      "transformers": ["slugify"]
    },
    {
      "id": "description",
      "message": "Project description",
      "type": "input",
      "transformers": ["trim"]
    }
  ]
}
```

### On Variables

Transform computed variable values:

```json
{
  "variables": [
    {
      "id": "upperProjectName",
      "value": "{{projectName}}",
      "transformers": ["uppercase"]
    },
    {
      "id": "packageName",
      "value": "{{projectName}}",
      "transformers": [
        "lowercase",
        {
          "type": "regex",
          "pattern": "\\s+",
          "replacement": "-",
          "flags": "g"
        }
      ]
    }
  ]
}
```

---

## Transformer Chains

Apply multiple transformers in sequence by using an array:

```json
{
  "id": "cleanedName",
  "value": "  My Project  ",
  "transformers": ["trim", "lowercase", "slugify"]
}
```

**Execution Order:**

1. `trim` → `"My Project"`
2. `lowercase` → `"my project"`
3. `slugify` → `"my-project"`

### Complex Chain Example

```json
{
  "id": "formattedName",
  "value": "{{userInput}}",
  "transformers": [
    "trim",
    {
      "type": "regex",
      "pattern": "[^a-zA-Z0-9\\s-]",
      "replacement": "",
      "flags": "g"
    },
    "lowercase",
    {
      "type": "regex",
      "pattern": "\\s+",
      "replacement": "-",
      "flags": "g"
    }
  ]
}
```

---

## Custom Transformers

Define custom transformers globally and reference them by ID throughout your configuration.

### Defining Custom Transformers

```json
{
  "transformers": [
    {
      "id": "reverse",
      "type": "custom",
      "handler": "value => value.split('').reverse().join('')"
    },
    {
      "id": "capitalize",
      "type": "custom",
      "handler": "value => value.charAt(0).toUpperCase() + value.slice(1)"
    }
  ]
}
```

### Using Custom Transformers

Reference custom transformers by their ID:

```json
{
  "id": "reversedName",
  "value": "{{projectName}}",
  "transformers": ["reverse"]
}
```

Or combine with other transformers:

```json
{
  "id": "processedName",
  "value": "{{projectName}}",
  "transformers": ["trim", "lowercase", "capitalize"]
}
```

---

## Examples

### Complete Configuration with Transformers

```json
{
  "$schema": "https://unpkg.com/@pixpilot/scaffoldfy/schema",
  "name": "transformers-example",
  "description": "Example configuration demonstrating value transformers",
  "prompts": [
    {
      "id": "projectName",
      "message": "What is the project name?",
      "type": "input",
      "required": true,
      "transformers": ["slugify"]
    },
    {
      "id": "description",
      "message": "Project description",
      "type": "input",
      "transformers": ["trim"]
    },
    {
      "id": "authorEmail",
      "message": "Author email",
      "type": "input",
      "transformers": ["lowercase"]
    }
  ],
  "variables": [
    {
      "id": "upperProjectName",
      "value": "{{projectName}}",
      "transformers": ["uppercase"]
    },
    {
      "id": "packageName",
      "value": "{{projectName}}",
      "transformers": [
        "lowercase",
        {
          "type": "regex",
          "pattern": "-",
          "replacement": "_",
          "flags": "g"
        }
      ]
    },
    {
      "id": "nameLength",
      "value": "computed",
      "transformers": [
        {
          "type": "computed",
          "expression": "projectName.length"
        }
      ]
    }
  ],
  "tasks": [
    {
      "id": "create-readme",
      "name": "Create README",
      "type": "write",
      "config": {
        "file": "README.md",
        "template": "# {{upperProjectName}}\n\n{{description}}\n\nPackage: {{packageName}}\nAuthor: {{authorEmail}}\nName Length: {{nameLength}}\n"
      }
    }
  ]
}
```

### Real-World Use Cases

#### 1. NPM Package Name from Project Name

```json
{
  "prompts": [
    {
      "id": "projectName",
      "message": "Project name",
      "type": "input",
      "transformers": [
        "trim",
        "lowercase",
        {
          "type": "regex",
          "pattern": "[^a-z0-9-]",
          "replacement": "",
          "flags": "g"
        }
      ]
    }
  ]
}
```

#### 2. Generate Multiple Name Variants

```json
{
  "prompts": [
    {
      "id": "componentName",
      "message": "Component name",
      "type": "input"
    }
  ],
  "variables": [
    {
      "id": "componentKebab",
      "value": "{{componentName}}",
      "transformers": ["slugify"]
    },
    {
      "id": "componentPascal",
      "value": "{{componentName}}",
      "transformers": [
        {
          "type": "regex",
          "pattern": "[-_\\s]+(.)?",
          "replacement": "$1",
          "flags": "g"
        },
        {
          "type": "computed",
          "expression": "componentName.charAt(0).toUpperCase() + componentName.slice(1)"
        }
      ]
    }
  ]
}
```

#### 3. Clean and Validate Email

```json
{
  "prompts": [
    {
      "id": "email",
      "message": "Email address",
      "type": "input",
      "transformers": ["trim", "lowercase"]
    }
  ]
}
```

---

## Best Practices

1. **Chain Order Matters**: Apply transformers in logical order (e.g., trim before lowercase)
2. **Use Built-ins First**: Leverage built-in transformers for common operations
3. **Keep Custom Simple**: Complex logic is better in computed transformers
4. **Test Expressions**: Verify computed transformer expressions work with your data
5. **Document Custom Transformers**: Add descriptions for reusable custom transformers

---

## Limitations

- Custom transformer handlers must be valid JavaScript arrow function expressions
- Computed expressions have access to configuration context but not Node.js modules
- Transformers run synchronously - async operations are not supported
- Regex transformers use JavaScript RegExp - some advanced features may not be available

---

## See Also

- [Prompts Documentation](PROMPTS.md)
- [Variables Documentation](VARIABLES.md)
