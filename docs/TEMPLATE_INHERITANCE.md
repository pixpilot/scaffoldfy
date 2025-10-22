# Template Inheritance

Template inheritance allows you to extend base templates, promoting code reuse and modularity in your template configurations. Templates can be loaded from local file paths or remote URLs (HTTP/HTTPS).

## Overview

With template inheritance, you can:

- **Extend one or more base templates** using the `extends` field
- **Load templates from local files or remote URLs** (HTTP/HTTPS)
- **Override tasks, variables, and prompts** from base templates using explicit merge strategies
- **Merge configurations intelligently** with smart conflict detection and resolution
- **Validate early** to catch configuration errors before user prompts
- **Create reusable template libraries** that can be shared across projects

## Basic Usage

### Single Inheritance

Create a base template:

```json
// base-template.json
{
  "tasks": [
    {
      "id": "update-package",
      "name": "Update package.json",
      "description": "Update package information",
      "required": true,
      "enabled": true,
      "type": "update-json",
      "config": {
        "file": "package.json",
        "updates": {
          "name": "{{projectName}}",
          "author": "{{author}}"
        }
      }
    }
  ]
}
```

Extend it in your template:

```json
// my-template.json
{
  "extends": "base-template.json",
  "tasks": [
    {
      "id": "cleanup-readme",
      "name": "Clean up README",
      "description": "Remove template instructions",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": {
        "file": "README.md",
        "template": "# {{projectName}}\n\nYour project description here."
      }
    }
  ]
}
```

The resulting template will have both tasks from the base and your custom task.

### Multiple Inheritance

You can extend multiple base templates:

```json
{
  "extends": ["base-common.json", "base-typescript.json"],
  "tasks": [
    {
      "id": "custom-task",
      "name": "Custom Task",
      "description": "Project-specific task",
      "required": true,
      "enabled": true,
      "type": "exec",
      "config": {
        "command": "echo 'Setup complete!'"
      }
    }
  ]
}
```

Tasks are merged in order, with later templates taking precedence.

## Override Strategies

**Important:** When a child template has a task, variable, or prompt with the same ID as a base template, you **must** explicitly specify an override strategy. This requirement was added to prevent accidental conflicts and make template inheritance more predictable.

### Available Strategies

There are two override strategies:

1. **`merge`** (default, recommended): Intelligently merges the child item with the base item
   - For tasks: Merges config, dependencies, prompts, and variables
   - For variables: Replaces the value
   - For prompts: Merges properties (message, type, etc.)

2. **`replace`**: Completely replaces the base item with the child item
   - No merging occurs - the base item is discarded entirely
   - Useful when you want to completely redefine an item

### Specifying Override Strategy

Add the `override` field to the conflicting task, variable, or prompt:

```json
{
  "extends": "base-template.json",
  "tasks": [
    {
      "id": "update-package",
      "name": "Custom Package Update",
      "description": "Updated description",
      "required": true,
      "enabled": true,
      "type": "update-json",
      "config": {
        "file": "package.json",
        "updates": {
          "name": "{{projectName}}",
          "version": "2.0.0"
        }
      },
      "override": "merge" // ← Required when ID conflicts with base
    }
  ]
}
```

### What Happens Without Override?

If you extend a template and use the same ID without specifying `override`, you'll get a clear error:

```
Task ID conflict: "update-package" is defined in multiple templates.
  Base task from: base-template.json
  Override task from: my-template.json
  You must specify an override strategy: add "override": "merge" or "override": "replace" to the task.
```

### Merge Strategy in Detail

When using `override: "merge"` for tasks:

**Base template:**

```json
{
  "id": "setup",
  "name": "basic-setup",
  "description": "Base setup",
  "required": true,
  "enabled": true,
  "type": "template",
  "config": {
    "file": "README.md",
    "templateFile": "./base-readme.hbs"
  },
  "dependencies": ["task-a"]
}
```

**Child template:**

```json
{
  "id": "setup",
  "name": "enhanced-setup",
  "description": "Enhanced setup with more features",
  "required": true,
  "enabled": true,
  "type": "template",
  "config": {
    "file": "README.md",
    "template": "# {{projectName}}\n\nCustom readme"
  },
  "dependencies": ["task-b"],
  "override": "merge"
}
```

**Result after merge:**

- `name`: `"Enhanced Setup"` (from child)
- `description`: `"Enhanced setup with more features"` (from child)
- `dependencies`: `["task-a", "task-b"]` (merged from both)
- `config.file`: `"README.md"` (both have same value)
- `config.templateFile`: removed (child specified `template` instead)
- `config.template`: `"# {{projectName}}\n\nCustom readme"` (from child)

Note how the conflicting config fields (`templateFile` vs `template`) were intelligently handled - when you specify `template` in the child, it removes `templateFile` from the base to prevent validation errors.

### Replace Strategy in Detail

When using `override: "replace"`:

```json
{
  "id": "setup",
  "name": "completely-new-setup",
  "description": "Starts from scratch",
  "required": false,
  "enabled": true,
  "type": "exec",
  "config": {
    "command": "npm init -y"
  },
  "override": "replace" // Nothing from base is kept
}
```

The base task is completely ignored, and only the child task definition is used.

### Override for Variables

```json
{
  "extends": "base.json",
  "variables": [
    {
      "id": "buildDir",
      "value": "dist",
      "override": "merge" // Required when variable ID conflicts
    }
  ]
}
```

### Override for Prompts

```json
{
  "extends": "base.json",
  "prompts": [
    {
      "id": "projectName",
      "type": "input",
      "message": "Enter your awesome project name:",
      "placeholder": "my-project",
      "override": "merge" // Required when prompt ID conflicts
    }
  ]
}
```

## Templates with Only Prompts/Variables

Starting from version 2.0, the `tasks` array is optional. This allows you to create base templates that only provide shared prompts and variables for child templates to use.

### Use Case

This is particularly useful when you want to:

- Create reusable prompt collections across multiple templates
- Define common variables that multiple child templates should use
- Build composable template libraries without duplicating prompts
- Separate concerns between data collection (base) and task execution (child)

### Example: Shared Prompts Template

**Base template** (`shared-prompts.json`):

```json
{
  "prompts": [
    {
      "id": "projectName",
      "type": "input",
      "message": "What is your project name?",
      "required": true
    },
    {
      "id": "author",
      "type": "input",
      "message": "Author name?",
      "required": true
    },
    {
      "id": "useTypeScript",
      "type": "confirm",
      "message": "Use TypeScript?",
      "default": true
    }
  ],
  "variables": [
    {
      "id": "currentYear",
      "value": {
        "type": "exec",
        "value": "node -e \"console.log(new Date().getFullYear())\""
      }
    }
  ]
}
```

**Child template** that extends it:

```json
{
  "extends": "shared-prompts.json",
  "tasks": [
    {
      "id": "setup-project",
      "name": "Setup Project",
      "description": "Initialize project using shared prompts",
      "required": true,
      "enabled": true,
      "type": "update-json",
      "config": {
        "file": "package.json",
        "updates": {
          "name": "{{projectName}}",
          "author": "{{author}}",
          "year": "{{currentYear}}"
        }
      }
    }
  ]
}
```

The child template inherits all prompts and variables from the base template and can use them in its tasks without redefining them.

## Remote Templates from URLs

Templates can be loaded from remote URLs (HTTP or HTTPS), enabling you to share base templates across projects and organizations.

### Loading from a URL

Specify a full URL in the `extends` field:

```json
{
  "extends": "https://raw.githubusercontent.com/your-org/templates/main/base.json",
  "tasks": [
    {
      "id": "custom-task",
      "name": "Custom Task",
      "description": "Project-specific task",
      "required": true,
      "enabled": true,
      "type": "exec",
      "config": {
        "command": "echo 'Setup complete!'"
      }
    }
  ]
}
```

### GitHub Raw URLs

For templates stored in GitHub repositories, use the raw content URL:

```
https://raw.githubusercontent.com/owner/repo/branch/path/to/template.json
```

Example:

```json
{
  "extends": [
    "https://raw.githubusercontent.com/your-org/templates/main/base-node.json",
    "https://raw.githubusercontent.com/your-org/templates/main/typescript.json"
  ],
  "tasks": []
}
```

### Relative URLs

When a remote template extends another template using a relative path, the path is resolved relative to the current template's URL:

```json
// https://example.com/templates/base.json
{
  "tasks": [
    {
      "id": "base-task",
      "name": "Base Task",
      "description": "Common task",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": {}
    }
  ]
}

// https://example.com/templates/frameworks/react.json
{
  "extends": "../base.json",  // Resolves to https://example.com/templates/base.json
  "tasks": [
    {
      "id": "react-setup",
      "name": "React Setup",
      "description": "Setup React",
      "required": true,
      "enabled": true,
      "type": "exec",
      "config": {
        "command": "npm install react react-dom"
      }
    }
  ]
}
```

### Mixed Local and Remote Templates

You can mix local file paths and remote URLs in your template inheritance:

```json
// Local template extending a remote base
{
  "extends": "https://example.com/org-templates/base.json",
  "tasks": [
    {
      "id": "local-task",
      "name": "Local Task",
      "description": "Project-specific task",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": {}
    }
  ]
}
```

Or a remote template can extend local templates (though this is less common):

```json
// Remote template
{
  "extends": "./local-overrides.json",
  "tasks": []
}
```

### Benefits of Remote Templates

- **Centralized Management**: Maintain organization-wide templates in one location
- **Version Control**: Use Git tags or branches to version your templates
- **Easy Updates**: Teams automatically get template updates without manual distribution
- **Sharing**: Share templates publicly or within your organization
- **Consistency**: Ensure all projects follow the same patterns and best practices

### Caching

Remote templates are cached in memory during execution to avoid repeated network requests. Each URL is fetched only once per execution, even if multiple templates extend from it.

### Security Considerations

- Only use HTTPS URLs from trusted sources
- Review remote templates before using them in production
- Consider pinning to specific versions (e.g., Git tags) for stability
- Be aware that remote templates can change unless locked to a specific version

### Remote Template Files

When a remote template uses the `templateFile` property in a `template` task, the file path is automatically resolved relative to the remote template's location. This allows remote templates to reference their own template files seamlessly.

#### How It Works

When you extend a remote template that contains tasks with `templateFile` references, the CLI automatically:

1. Tracks the source URL of each task
2. Resolves `templateFile` paths relative to the remote template's URL
3. Fetches the template file from the remote location
4. Processes it with the specified template engine (Handlebars for `.hbs` files)

#### Example: Remote Template with Template Files

**Remote base template** at `https://raw.githubusercontent.com/your-org/templates/main/base-node.json`:

```json
{
  "tasks": [
    {
      "id": "create-tsconfig",
      "name": "Create TypeScript Config",
      "description": "Generate tsconfig.json",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": {
        "file": "tsconfig.json",
        "templateFile": "./tsconfig.hbs"
      }
    },
    {
      "id": "create-readme",
      "name": "Create README",
      "description": "Generate README.md",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": {
        "file": "README.md",
        "templateFile": "../shared/readme.hbs"
      }
    }
  ]
}
```

**Template files hosted alongside the template:**

- `https://raw.githubusercontent.com/your-org/templates/main/tsconfig.hbs`
- `https://raw.githubusercontent.com/your-org/templates/shared/readme.hbs`

**Your local template** extending the remote one:

```json
{
  "extends": "https://raw.githubusercontent.com/your-org/templates/main/base-node.json",
  "tasks": [
    {
      "id": "custom-task",
      "name": "Custom Task",
      "description": "Your project-specific task",
      "required": true,
      "enabled": true,
      "type": "exec",
      "config": {
        "command": "npm install"
      }
    }
  ]
}
```

When you run this, the CLI will:

1. Fetch `base-node.json` from GitHub
2. For the `create-tsconfig` task, resolve `./tsconfig.hbs` → `https://raw.githubusercontent.com/your-org/templates/main/tsconfig.hbs`
3. For the `create-readme` task, resolve `../shared/readme.hbs` → `https://raw.githubusercontent.com/your-org/templates/shared/readme.hbs`
4. Fetch both template files from their remote locations
5. Process them with Handlebars to generate the output files

#### Path Resolution Rules

The `templateFile` paths are resolved using standard URL/path resolution:

- **Relative paths** (`./file.hbs`, `file.hbs`): Resolved relative to the template's directory
- **Parent directory paths** (`../file.hbs`): Navigate up from the template's directory
- **Absolute URLs** (`https://...`): Used as-is
- **Absolute local paths** (`/path/to/file.hbs`): Used as-is for local templates

#### Mixed Remote and Local Template Files

You can combine remote templates with local template files, though remote templates with remote template files are more common for portability:

```json
{
  "extends": "https://example.com/templates/base.json",
  "tasks": [
    {
      "id": "custom-template",
      "name": "Custom Template",
      "description": "Use local template file",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": {
        "file": "output.txt",
        "templateFile": "./local-template.hbs"
      }
    }
  ]
}
```

In this case, the `create-tsconfig` task from the remote template will fetch its template file from the remote location, while your `custom-template` task will use the local `./local-template.hbs` file.

## Task Overriding

If a child template defines a task with the same ID as a base template, the child's task completely replaces the base task:

```json
// base.json
{
  "tasks": [
    {
      "id": "setup-git",
      "name": "Initialize Git",
      "description": "Initialize git repository",
      "required": true,
      "enabled": true,
      "type": "git-init",
      "config": {
        "removeExisting": false,
        "initialCommit": true
      }
    }
  ]
}

// child.json
{
  "extends": "base.json",
  "tasks": [
    {
      "id": "setup-git",
      "name": "Custom Git Setup",
      "description": "Custom git initialization",
      "required": true,
      "enabled": true,
      "type": "git-init",
      "config": {
        "removeExisting": true,
        "initialCommit": true,
        "message": "🎉 Initial commit"
      }
    }
  ]
}
```

The child's `setup-git` task completely replaces the base version.

## Dependency and Prompt Merging

When overriding a task, dependencies and prompts are intelligently merged:

```json
// base.json
{
  "tasks": [
    {
      "id": "complex-task",
      "name": "Complex Task",
      "description": "Task with dependencies",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": {},
      "dependencies": ["task-a"],
      "prompts": [
        {
          "id": "prompt1",
          "type": "input",
          "message": "Enter value 1"
        }
      ]
    }
  ]
}

// child.json
{
  "extends": "base.json",
  "tasks": [
    {
      "id": "complex-task",
      "name": "Enhanced Complex Task",
      "description": "Enhanced version",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": { "enhanced": true },
      "dependencies": ["task-b", "task-c"],
      "prompts": [
        {
          "id": "prompt2",
          "type": "confirm",
          "message": "Enable feature?"
        }
      ]
    }
  ]
}
```

The resulting task will have:

- **Dependencies**: `["task-a", "task-b", "task-c"]` (merged and deduplicated)
- **Prompts**: Both `prompt1` and `prompt2` (merged by ID)
- **Config**: `{ "enhanced": true }` (child overrides base)

## Relative Paths

Template paths in `extends` are resolved relative to the template file containing them:

```
templates/
├── base/
│   └── common.json
├── typescript/
│   └── ts-base.json  (extends: "../base/common.json")
└── my-project.json    (extends: "typescript/ts-base.json")
```

## Programmatic Usage

```typescript
import { loadAndMergeTemplate, loadTasksWithInheritance } from '@pixpilot/scaffoldfy';

// Load tasks with full inheritance resolution
const tasks = await loadTasksWithInheritance('./my-template.json');

// Or load and get the full configuration
const config = await loadAndMergeTemplate('./my-template.json');
console.log(`Loaded ${config.tasks.length} tasks`);
```

## Advanced: Circular Dependency Detection

The system automatically detects and prevents circular dependencies:

```json
// template-a.json
{
  "extends": "template-b.json",
  "tasks": []
}

// template-b.json
{
  "extends": "template-a.json",  // ❌ Error: Circular dependency!
  "tasks": []
}
```

## Best Practices

1. **Create a library of base templates** for common project types
2. **Use descriptive task IDs** to make overriding intentional and clear
3. **Document what can be overridden** in your base templates
4. **Keep inheritance chains shallow** (2-3 levels max) for maintainability
5. **Version your base templates** if they're shared across projects
6. **Test inheritance chains** to ensure tasks merge as expected
7. **Use unique IDs across all types** - All IDs must be unique across tasks, variables, and prompts. For example, you cannot have a task with ID `projectName` and a variable with the same ID `projectName`

## ID Uniqueness Validation

Starting from version 2.1, Scaffoldfy validates that all IDs are unique across tasks, variables, and prompts when templates are merged during inheritance. This prevents naming conflicts and ensures clarity in your template configurations.

### Valid Example

```json
{
  "tasks": [
    {
      "id": "setup-project",
      "name": "Setup Project",
      "description": "Initialize the project",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": {}
    }
  ],
  "variables": [
    {
      "id": "currentYear",
      "value": "2024"
    }
  ],
  "prompts": [
    {
      "id": "projectName",
      "type": "input",
      "message": "Project name?"
    }
  ]
}
```

All IDs are unique: `setup-project`, `currentYear`, and `projectName`.

### Invalid Example (Will Throw Error)

```json
{
  "tasks": [
    {
      "id": "projectName",
      "name": "Setup",
      "description": "Setup task",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": {}
    }
  ],
  "prompts": [
    {
      "id": "projectName", // ❌ Error: Duplicate ID!
      "type": "input",
      "message": "Project name?"
    }
  ]
}
```

This will throw an error: `Duplicate ID "projectName" found in prompt. This ID is already used in task`

### With Inheritance

The validation also applies when templates are merged through inheritance:

```json
// base.json
{
  "variables": [
    {
      "id": "sharedId",
      "value": "base-value"
    }
  ]
}

// child.json
{
  "extends": "base.json",
  "tasks": [
    {
      "id": "sharedId",  // ❌ Error: Conflicts with variable from base!
      "name": "My Task",
      "description": "Task",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": {}
    }
  ]
}
```

This will throw an error when loading the child template.

### Overriding is Allowed

Note that overriding items of the **same type** is allowed and intentional:

```json
// base.json
{
  "tasks": [
    {
      "id": "setup",
      "name": "Base Setup",
      "description": "Base setup task",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": {}
    }
  ]
}

// child.json
{
  "extends": "base.json",
  "tasks": [
    {
      "id": "setup",  // ✅ OK: Overriding task with same ID
      "name": "Custom Setup",
      "description": "Customized setup",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": { "custom": true }
    }
  ]
}
```

This is valid - the child's `setup` task will completely replace the base's `setup` task.

## Example: Organization Template Library

```
org-templates/
├── base.json           # Common tasks for all projects
├── node-base.json      # Node.js specific (extends: base.json)
├── ts-base.json        # TypeScript specific (extends: node-base.json)
└── react-base.json     # React specific (extends: ts-base.json)
```

Your project template:

```json
{
  "extends": "../org-templates/react-base.json",
  "tasks": [
    {
      "id": "project-specific-setup",
      "name": "Project Setup",
      "description": "Custom setup for this project",
      "required": true,
      "enabled": true,
      "type": "exec",
      "config": {
        "command": "npm run setup"
      }
    }
  ]
}
```

## CLI Usage

The CLI automatically handles template inheritance from both local files and remote URLs:

```bash
# Load template from local file with inheritance
scaffoldfy --tasks-file ./my-template.json

# Load template from remote URL
scaffoldfy --tasks-file https://example.com/templates/project-setup.json

# Dry run to see all inherited and merged tasks
scaffoldfy --tasks-file ./my-template.json --dry-run

# Dry run with remote template
scaffoldfy --tasks-file https://raw.githubusercontent.com/org/templates/main/base.json --dry-run
```

## API Reference

### `loadTemplate(templatePath: string): Promise<TasksConfiguration>`

Load a single template file from a local path or remote URL without processing inheritance.

**Parameters:**

- `templatePath`: Local file path (absolute or relative) or remote URL (http/https)

**Example:**

```typescript
// Load from local file
const local = await loadTemplate('./template.json');

// Load from URL
const remote = await loadTemplate('https://example.com/template.json');
```

### `loadAndMergeTemplate(templatePath: string): Promise<TasksConfiguration>`

Load a template and recursively merge all extended templates. Supports both local and remote templates.

**Parameters:**

- `templatePath`: Local file path or remote URL to the main template

**Example:**

```typescript
// Load and merge with inheritance from URL
const config = await loadAndMergeTemplate('https://example.com/my-template.json');
console.log(`Loaded ${config.tasks.length} tasks`);
```

### `loadTasksWithInheritance(tasksFilePath: string): Promise<TaskDefinition[]>`

Load tasks from a file or URL, processing all inheritance, and return the final task array.

**Parameters:**

- `tasksFilePath`: Local file path or remote URL to the tasks configuration

**Example:**

```typescript
// Load from URL with full inheritance chain
const tasks = await loadTasksWithInheritance(
  'https://raw.githubusercontent.com/org/templates/main/nodejs.json',
);
```

### `mergeTemplates(templates: TasksConfiguration[]): TasksConfiguration`

Merge multiple template configurations manually.

### `clearTemplateCache(): void`

Clear the internal template cache (useful for testing).

## Real-World Examples

### Example 1: Organization Template Library on GitHub

Host your organization's templates on GitHub and reference them via raw URLs:

```json
// Your project's template
{
  "extends": [
    "https://raw.githubusercontent.com/acme-corp/project-templates/v1.0.0/base-node.json",
    "https://raw.githubusercontent.com/acme-corp/project-templates/v1.0.0/typescript.json"
  ],
  "tasks": [
    {
      "id": "install-deps",
      "name": "Install Project Dependencies",
      "description": "Install project-specific dependencies",
      "required": true,
      "enabled": true,
      "type": "exec",
      "config": {
        "command": "npm install"
      }
    }
  ]
}
```

**Benefits:**

- Version pinning with Git tags (v1.0.0)
- Easy updates across all projects
- Centralized maintenance

### Example 2: Public Template Ecosystem

Create and share public templates:

```json
{
  "extends": "https://templates.scaffoldfy.dev/react-app/v2.json",
  "tasks": [
    {
      "id": "custom-setup",
      "name": "Custom Project Setup",
      "description": "Project-specific configuration",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": {
        "file": "package.json",
        "template": "templates/package.hbs"
      }
    }
  ]
}
```

### Example 3: Private CDN for Templates

Host templates on a private CDN or internal server:

```json
{
  "extends": [
    "https://templates.internal.company.com/base/security.json",
    "https://templates.internal.company.com/base/compliance.json",
    "https://templates.internal.company.com/tech/nodejs-v18.json"
  ],
  "tasks": []
}
```

### Example 4: Mix of Local and Remote

Combine organization templates with project-specific local templates:

```json
// my-project-template.json
{
  "extends": [
    "https://raw.githubusercontent.com/org/templates/main/base.json",
    "./local-overrides.json"
  ],
  "tasks": [
    {
      "id": "project-init",
      "name": "Initialize Project",
      "description": "Project-specific initialization",
      "required": true,
      "enabled": true,
      "type": "exec",
      "config": {
        "command": "npm run init"
      }
    }
  ]
}
```

```json
// local-overrides.json (local file)
{
  "tasks": [
    {
      "id": "local-config",
      "name": "Local Configuration",
      "description": "Set up local environment",
      "required": true,
      "enabled": true,
      "type": "update-json",
      "config": {
        "file": ".env.local",
        "updates": {
          "API_URL": "http://localhost:3000"
        }
      }
    }
  ]
}
```

### Best Practices for Remote Templates

1. **Use Version Tags**: Pin to specific versions using Git tags for stability

   ```
   https://raw.githubusercontent.com/org/templates/v1.2.3/base.json
   ```

2. **Use HTTPS**: Always use secure HTTPS URLs, never HTTP

3. **Document Dependencies**: Document what remote templates your project depends on

4. **Test Before Deploying**: Test remote template changes in a staging environment

5. **Have Fallbacks**: Consider caching critical templates locally as backups

6. **Monitor Changes**: If using branch references (like `main`), monitor for breaking changes

7. **Access Control**: For private templates, use authenticated URLs or host on secure servers
