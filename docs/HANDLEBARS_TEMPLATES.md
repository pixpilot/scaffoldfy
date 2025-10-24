---
layout: default
title: Handlebars Templates - Scaffoldfy
---

# Template Tasks with Handlebars

The `template` task type supports powerful templating capabilities using [Handlebars](https://handlebarsjs.com/), enabling you to generate files from templates with advanced features like conditionals, loops, and helpers.

## Overview

Template tasks can use two different templating approaches:

1. **Simple Interpolation** (default): Basic `{{variable}}` replacement for inline templates and non-`.hbs` files
2. **Handlebars**: Full Handlebars templating engine for files with `.hbs` extension

Templates can be defined in two ways:

1. **Inline**: Template string directly in the task configuration (simple interpolation only)
2. **File-based**: External template file (relative to project root or template source). `.hbs` files automatically use Handlebars

> **Note**: When using [template inheritance](./TEMPLATE_INHERITANCE.md) with remote templates, `templateFile` paths are automatically resolved relative to the remote template's location. This allows remote templates to reference their own template files hosted alongside them.

## Configuration Options

### Basic Options

- **`file`** (required): Path to the output file to create or overwrite
- **`template`** (optional): Inline template string using simple `{{variable}}` syntax
- **`templateFile`** (optional): Path to external template file (relative to project root, or for remote templates, relative to the template's URL)
- **`condition`** (optional): JavaScript expression to conditionally execute the task

**Important**: You must specify either `template` OR `templateFile`, but not both.

## Automatic Handlebars Detection

**Handlebars is automatically enabled for any template file ending in `.hbs`**. No configuration needed!

### File-based Handlebars Example

**Template file** (`templates/readme.hbs`):

```handlebars
#
{{projectName}}

>
{{projectName}}
is a modern TypeScript project.

{{#if author}}
  ## 👥 Author

  {{author}}
{{/if}}

{{#if features}}
  ## ✨ Features

  {{#each features}}
    -
    {{this}}
  {{/each}}
{{/if}}

## 📄 License MIT
```

**Task configuration**:

```json
{
  "id": "clean-readme",
  "name": "Clean README",
  "description": "Create a fresh README for the new project",
  "required": true,
  "enabled": true,
  "type": "write",
  "config": {
    "file": "README.md",
    "templateFile": "templates/readme.hbs"
  }
}
```

## Simple Interpolation (Default)

When using inline templates or template files that don't end in `.hbs`, simple `{{variable}}` replacement is used.

### Inline Template Example

```json
{
  "id": "simple-readme",
  "name": "Simple README",
  "type": "write",
  "config": {
    "file": "README.md",
    "template": "# {{projectName}}\n\nAuthor: {{author}}\nRepository: {{repoUrl}}"
  }
}
```

### File-based Simple Template Example

**Template file** (`templates/simple-readme.txt`):

```
# {{projectName}}

Author: {{author}}
Repository: {{repoUrl}}
```

**Task configuration**:

```json
{
  "id": "simple-readme-file",
  "name": "Simple README from File",
  "type": "write",
  "config": {
    "file": "README.md",
    "templateFile": "templates/simple-readme.txt"
  }
}
```

## Handlebars Features

### Conditionals

```handlebars
{{#if author}}
  Author:
  {{author}}
{{/if}}

{{#unless private}}
  This is a public package
{{/unless}}
```

### Loops

```handlebars
## Packages

{{#each packages}}
  - **{{name}}**:
  {{description}}
{{/each}}
```

### Else Blocks

```handlebars
{{#if description}}
  {{description}}
{{else}}
  No description available
{{/if}}
```

### Comments

```handlebars
{{! This is a comment and won't appear in the output }}
```

### Built-in Helpers

Handlebars includes many built-in helpers:

- `{{#if}}`, `{{#unless}}`
- `{{#each}}`, `{{#with}}`
- `{{#eq}}`, `{{#ne}}` (with custom helper registration)

See [Handlebars documentation](https://handlebarsjs.com/guide/builtin-helpers.html) for complete details.

## Available Variables

All configuration variables from your `InitConfig` are available in templates:

- `projectName`: Repository name
- `owner`: Repository owner
- `repoUrl`: Full repository URL
- `author`: Author name
- `repoUrl`: Base repository URL
- `orgName`: Organization name
- Plus any variables collected from prompts

## Best Practices

### When to Use Simple vs. Handlebars

**Use Simple Interpolation when:**

- You only need basic variable replacement
- Template is very simple
- Using inline templates
- Backwards compatibility is important

**Use Handlebars when:**

- You need conditionals or loops
- Template has complex logic
- You want cleaner, more readable templates
- Using external `.hbs` template files

### Inline vs. File-based Templates

**Use Inline Templates when:**

- Template is short (< 5 lines)
- Quick prototyping
- Template is specific to one use case

**Use File-based Templates when:**

- Template is long or complex
- Template might be reused
- You want syntax highlighting and better editing experience
- You need Handlebars features (use `.hbs` extension)

### File Organization

Recommended structure for template files:

```
project-root/
├── .scaffoldfy/
│   └── templates/
│       ├── readme.hbs          # Handlebars template
│       ├── package-json.hbs    # Handlebars template
│       ├── license.txt         # Simple template
│       └── contributing.md     # Simple template
└── template-tasks.json
```

## Complete Example

**Task configuration** (`template-tasks.json`):

```json
{
  "tasks": [
    {
      "id": "clean-readme",
      "name": "Generate README",
      "description": "Create README using Handlebars template",
      "required": true,
      "enabled": true,
      "type": "write",
      "config": {
        "file": "README.md",
        "templateFile": ".scaffoldfy/templates/readme.hbs"
      }
    },
    {
      "id": "update-package-json",
      "name": "Update package.json",
      "description": "Generate package.json from simple template",
      "required": true,
      "enabled": true,
      "type": "write",
      "config": {
        "file": "package.json",
        "templateFile": ".scaffoldfy/templates/package-json.hbs"
      }
    },
    {
      "id": "inline-license",
      "name": "Create LICENSE",
      "description": "Create simple license file",
      "required": false,
      "enabled": true,
      "type": "write",
      "config": {
        "file": "LICENSE",
        "template": "MIT License\n\nCopyright (c) {{author}}\n\nPermission is hereby granted..."
      }
    }
  ]
}
```

**Handlebars template** (`.scaffoldfy/templates/readme.hbs`):

````handlebars
#
{{projectName}}

{{#if description}}
  >
  {{description}}
{{else}}
  > A modern TypeScript project
{{/if}}

## 🚀 Quick Start ```sh # Install dependencies pnpm install # Build pnpm build # Test pnpm
test
````

{{#if features}}

## ✨ Features

{{#each features}}

- {{this}}
  {{/each}}
  {{/if}}

{{#if author}}

## 👥 Author

{{author}}
{{/if}}

## 📄 License

MIT

```

## Error Handling

### Missing Template File

If a `templateFile` is specified but doesn't exist, the task will throw an error:

```

✗ Failed to read template file: templates/missing.hbs
✗ Error: Template file not found: templates/missing.hbs

```

### Invalid Handlebars Syntax

If Handlebars syntax is invalid in a `.hbs` file, you'll get a compilation error:

```

✗ Failed to compile Handlebars template
✗ Error: Parse error on line 5: ...

```

### Both template and templateFile

You cannot specify both options:

```

✗ Template task cannot have both "template" and "templateFile" specified. Use one or the other.

````

## Migration from Previous Versions

### From useHandlebars flag

**Before (with flag)**:

```json
{
  "templateFile": "readme.hbs",
  "useHandlebars": true
}
````

**After (automatic)**:

```json
{
  "templateFile": "readme.hbs"
}
```

### From inline Handlebars

**Before (inline Handlebars)**:

```json
{
  "template": "# {{projectName}}\n{{#if author}}Author: {{author}}{{/if}}",
  "useHandlebars": true
}
```

**After (file-based only)**:

```json
{
  "templateFile": "readme.hbs"
}
```

## See Also

- [Handlebars Documentation](https://handlebarsjs.com/)
- [Template Task Types](./TASK_TYPES.md#template)
- [Prompts Documentation](./PROMPTS.md)
- [Examples Directory](../examples/)
