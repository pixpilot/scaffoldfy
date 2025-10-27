# JSON Schema Validation

Scaffoldfy includes a JSON schema validator to catch errors in your config files before runtime.

## Usage

### From the Root of the Repository

Use the convenient root script to validate files from anywhere in the monorepo:

```bash
# Validate a single file
pnpm validate:json --file packages/scaffoldfy/examples/config-tasks-with-prompts.json

# Validate all JSON files in a directory
pnpm validate:json --dir packages/scaffoldfy/examples
```

### From the scaffoldfy Package

If you're working inside the `packages/scaffoldfy` directory:

```bash
# Validate a single file
pnpm run validate-scaffoldfy-json --file examples/config-tasks-with-prompts.json

# Validate all JSON files in a directory
pnpm run validate-scaffoldfy-json --dir examples
```

### Using the Binary Directly

After building the package, you can use the binary directly:

```bash
# From the scaffoldfy package directory
node dist/scaffoldfy-config-validator/cli.js --file examples/config-tasks-with-prompts.json
node dist/scaffoldfy-config-validator/cli.js --dir examples
```

### Programmatic API

You can also use the validator programmatically in your code:

```typescript
import { validateScaffoldfyJsonFile } from '@pixpilot/scaffoldfy';

// Validate a single file
const result = validateScaffoldfyJsonFile('path/to/scaffoldfy.json');

if (result.valid) {
  console.log('✅ File is valid');
} else {
  console.error('❌ Validation failed:');
  result.errors?.forEach((error) => console.error(`  - ${error}`));
}
```

The `validateScaffoldfyJsonFile` function returns an object with:

- `valid` (boolean): Whether the file is valid
- `errors` (string[] | undefined): Array of error messages if validation failed

## Pre-commit Validation

The validator is automatically integrated with pre-commit hooks via `lint-staged`. Any JSON files in the `packages/scaffoldfy` directory will be validated before commits.

If validation fails, the commit will be blocked until the errors are fixed.

## What Gets Validated

The validator checks JSON files that have a `$schema` property pointing to a scaffoldfy schema. For example:

```json
{
  "$schema": "https://unpkg.com/@pixpilot/scaffoldfy/schema",
  "name": "my-config",
  "tasks": []
}
```

Files without a `$schema` property are skipped.

## Common Validation Errors

### Missing Required Properties

```
root: must have required property 'name'
/tasks/0: must have required property 'id'
```

**Solution**: Add the missing required properties to your JSON file.

### Invalid Task Configuration

```
/tasks/0/config: must have required property 'target'
/tasks/0: must match exactly one schema in oneOf
```

**Solution**: Check the schema reference for the required properties for your task type.

### Additional Properties

```
/tasks/0/config: must NOT have additional properties
```

**Solution**: Remove any properties that are not defined in the schema.

## Options

### `--file <path>` or `-f <path>`

Validate a single JSON file.

```bash
pnpm validate:json --file path/to/file.json
```

### `--dir <path>` or `-d <path>`

Validate all JSON files in a directory recursively. The validator will:

- Scan the directory and all subdirectories
- Skip `node_modules`, `.git`, and hidden directories
- Validate only files ending in `.json`

```bash
pnpm validate:json --dir path/to/directory
```

## Exit Codes

- `0`: All files validated successfully
- `1`: One or more files failed validation or an error occurred

## Integration with CI/CD

You can integrate the validator into your CI/CD pipeline:

```yaml
# Example for GitHub Actions
- name: Validate JSON files
  run: pnpm validate:json --dir packages/scaffoldfy/examples
```

## Tips

1. **Always add a `$schema` property** to your scaffoldfy JSON files to enable validation
2. **Use the published schema URL**: `"https://unpkg.com/@pixpilot/scaffoldfy/schema"`
3. **Run validation before committing** to catch errors early
4. **Use `--dir` for batch validation** when making schema changes to ensure all files are still valid
