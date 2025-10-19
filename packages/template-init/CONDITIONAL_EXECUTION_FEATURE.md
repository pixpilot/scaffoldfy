# Conditional Execution Feature - Implementation Summary

## Overview

Extended the `condition` field from only `delete` tasks to **all task types** in the template-init package. This allows any task to be conditionally executed based on JavaScript expressions evaluated against configuration variables.

## Changes Made

### 1. Type Definitions (`src/types.ts`)

Added optional `condition?: string` field to all task config interfaces:

- ✅ `UpdateJsonConfig`
- ✅ `TemplateConfig`
- ✅ `RegexReplaceConfig`
- ✅ `ReplaceInFileConfig`
- ✅ `DeleteConfig` (already had it)
- ✅ `RenameConfig`
- ✅ `GitInitConfig`
- ✅ `ExecConfig`

### 2. Task Executors (`src/task-executors.ts`)

Implemented condition checking at the start of each executor function:

- ✅ `executeUpdateJson` - Checks condition before updating JSON files
- ✅ `executeTemplate` - Checks condition before creating/overwriting files
- ✅ `executeRegexReplace` - Checks condition before regex replacements
- ✅ `executeReplaceInFile` - Checks condition before text replacements
- ✅ `executeDelete` - Already had condition support
- ✅ `executeRename` - Checks condition before renaming files
- ✅ `executeGitInit` - Checks condition before git initialization
- ✅ `executeExec` - Checks condition before command execution

**Implementation Pattern:**

```typescript
// Check condition if specified
if (config.condition != null && config.condition !== '') {
  const shouldExecute = evaluateCondition(config.condition, initConfig);
  if (!shouldExecute) {
    log('Condition not met, skipping [task-type] task', 'info');
  }
}
```

### 3. Tests (`test/task-executors.test.ts`)

Added comprehensive test coverage for conditional execution:

- ✅ Tests for each task type with `condition: "true"` (should execute)
- ✅ Tests for each task type with `condition: "false"` (should skip)
- ✅ Tests for condition evaluation with config variables
- ✅ Tests for git-init and exec conditional execution

**Test Results:** All 133 tests pass ✅

### 4. Documentation (`docs/TASK_TYPES.md`)

Updated documentation for all task types:

- ✅ Added `condition?: string` to each task's Configuration section
- ✅ Added "Conditional Example" for each task type showing practical usage
- ✅ Updated Features section to mention conditional execution
- ✅ Created comprehensive "Conditional Execution" section in "Common Features"
- ✅ Updated "Task Type Selection Guide" to include conditional operations

**Documentation includes:**

- How conditional execution works
- Supported operators (comparison, logical, ternary)
- Common patterns and examples
- Access to config variables including prompt values

### 5. JSON Schema (`schema/tasks.schema.json`)

Updated the JSON schema to support the `condition` field:

- ✅ Added `condition` property to all task config schemas
- ✅ Consistent description across all task types
- ✅ Maintains backward compatibility (field is optional)

## Usage Examples

### Basic Conditional Execution

```json
{
  "type": "update-json",
  "config": {
    "file": "package.json",
    "updates": { "private": true },
    "condition": "makePrivate === true"
  }
}
```

### Using Prompt Values

```json
{
  "prompts": [
    {
      "id": "includeDocs",
      "type": "confirm",
      "message": "Include documentation?"
    }
  ],
  "type": "template",
  "config": {
    "file": "CONTRIBUTING.md",
    "template": "# Contributing Guide\n...",
    "condition": "includeDocs === true"
  }
}
```

### Complex Conditions

```json
{
  "type": "delete",
  "config": {
    "paths": ["examples", "test-fixtures"],
    "condition": "!keepExamples && environment !== 'development'"
  }
}
```

### Numeric Conditions

```json
{
  "type": "exec",
  "config": {
    "command": "npm run build:production",
    "condition": "version >= 2"
  }
}
```

## Benefits

1. **Consistency**: All task types now support the same conditional execution pattern
2. **Flexibility**: Users can conditionally execute any operation based on prompts or config
3. **Backward Compatible**: The `condition` field is optional; existing tasks work unchanged
4. **Well Tested**: Comprehensive test coverage ensures reliability
5. **Fully Documented**: Updated docs with examples for each task type

## Technical Details

### Condition Evaluation

Conditions are evaluated using the existing `evaluateCondition()` utility from `utils.ts`:

- JavaScript expressions evaluated with config context
- Supports all standard JS operators
- Safe execution with error handling
- Returns `false` for invalid conditions (with warning log)

### Error Handling

- Invalid conditions log a warning and skip the task
- Tasks continue to execute normally if no condition is specified
- Required tasks still stop execution on failure (regardless of condition)

## Compatibility

- ✅ Fully backward compatible
- ✅ No breaking changes
- ✅ Existing task files work without modification
- ✅ Schema validation maintained

## Testing

All tests pass successfully:

```
Test Files  9 passed (9)
Tests      133 passed (133)
```

Test coverage includes:

- Unit tests for each task executor with conditions
- Integration tests for condition evaluation
- Edge cases (invalid conditions, missing config, etc.)
