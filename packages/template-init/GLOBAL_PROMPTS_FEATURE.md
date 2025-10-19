# Global Prompts Feature

## Overview

Global prompts allow you to mark any prompt with `"global": true` so that its value is available to **all tasks**, not just the task where it's defined. This is useful for project-wide settings like project name, version, author, license, etc.

## How It Works

### Before (Without Global Prompts)

Previously, prompt values were only available within the task that defined them. If multiple tasks needed the same value, you had to either:

1. Ask the user the same question multiple times (poor UX)
2. Manually pass values between tasks (not possible)

### After (With Global Prompts)

Now you can mark prompts as global:

```json
{
  "prompts": [
    {
      "id": "projectName",
      "type": "input",
      "message": "What is your project name?",
      "global": true
    }
  ]
}
```

The `projectName` value is now available in **all tasks** throughout the initialization process.

## Implementation Details

### 1. Type System (`types.ts`)

- Added `global?: boolean` property to `BasePrompt` interface
- This property is inherited by all prompt types (InputPrompt, NumberPrompt, SelectPrompt, ConfirmPrompt)

### 2. Prompt Collection (`run-initialization.ts`)

The prompt collection logic now:

1. Separates global prompts from task-specific prompts
2. Deduplicates global prompts (if the same global prompt is defined in multiple tasks)
3. Collects global prompts **first** with a clear label
4. Collects task-specific prompts afterwards
5. Merges all values into the config object

### 3. Validation (`prompts.ts`)

Enhanced validation to:

- Allow duplicate prompt IDs only if all instances are marked as global
- Detect conflicts when the same ID is used as both global and task-specific
- Provide clear error messages for validation failures

### 4. JSON Schema (`tasks.schema.json`)

Added `global` property to the prompt schema definition with proper documentation.

## Usage Example

```json
{
  "tasks": [
    {
      "id": "init-package",
      "name": "Initialize package.json",
      "prompts": [
        {
          "id": "projectName",
          "type": "input",
          "message": "Project name?",
          "global": true
        },
        {
          "id": "version",
          "type": "input",
          "message": "Initial version?",
          "default": "0.1.0",
          "global": true
        }
      ],
      "config": {
        "file": "package.json",
        "updates": {
          "name": "{{projectName}}",
          "version": "{{version}}"
        }
      }
    },
    {
      "id": "create-readme",
      "name": "Create README",
      "config": {
        "file": "README.md",
        "template": "# {{projectName}}\\n\\nVersion: {{version}}"
      }
    },
    {
      "id": "create-changelog",
      "name": "Create CHANGELOG",
      "config": {
        "file": "CHANGELOG.md",
        "template": "# Changelog for {{projectName}}\\n\\n## [{{version}}] - 2025-10-19"
      }
    }
  ]
}
```

In this example:

- `projectName` and `version` are prompted **once** at the beginning
- All three tasks can use these values via `{{projectName}}` and `{{version}}`

## User Experience

When running initialization with global prompts:

```
📋 Global prompts (available to all tasks):
? Project name? my-awesome-app
? Initial version? 1.0.0

📋 Task-specific prompts:
? Enable debug mode? Yes

Starting initialization tasks...
```

Global prompts are clearly labeled and collected upfront, providing a better user experience.

## Validation Rules

1. **Unique IDs**: Prompt IDs must be unique unless they're all marked as global
2. **No conflicts**: A prompt ID cannot be both global and task-specific
3. **Standard validation**: All standard prompt validation rules still apply

## Testing

Added comprehensive tests in:

- `test/prompts.test.ts` - Unit tests for validation logic
- `test/prompts-integration.test.ts` - Integration tests demonstrating real-world usage

All 144 tests pass ✅

## Documentation

Updated documentation in:

- `docs/PROMPTS.md` - Full guide with global prompts section and examples
- `docs/PROMPTS_QUICK_REFERENCE.md` - Quick reference with global property
- `README.md` - Updated examples to show global prompts
- `examples/template-tasks-with-global-prompts.json` - Complete working example

## Benefits

1. **Better UX**: Users aren't asked the same question multiple times
2. **Cleaner config**: Shared values are defined once, used everywhere
3. **Flexibility**: Choose which prompts should be global vs task-specific
4. **Backwards compatible**: Existing tasks without `global` property work exactly as before
5. **Type-safe**: Full TypeScript support with proper types

## Migration

Existing tasks don't need to change. To use global prompts:

1. Add `"global": true` to any prompt you want to share across tasks
2. Use the prompt value in any task via `{{promptId}}`

That's it! No breaking changes.
