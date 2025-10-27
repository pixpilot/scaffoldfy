/**
 * Unified schema validation for template tasks configuration
 * Uses JSON Schema validation via Ajv to validate task configurations
 * Supports both JSON file validation and in-memory config validation
 */

import type { ErrorObject } from 'ajv';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { log } from '../utils';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/**
 * Create and configure Ajv instance
 */
function createValidator(): Ajv {
  return new Ajv({
    allErrors: true,
    verbose: true,
    strict: false,
    // Discriminator helps Ajv choose the right oneOf branch faster
    discriminator: true,
  });
}

/**
 * Load schema from file path
 */
function loadSchema(schemaPath: string): Record<string, unknown> {
  try {
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    return JSON.parse(schemaContent) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      `Failed to load schema from ${schemaPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Core validation function used by both use cases
 */
function validateAgainstSchema(
  data: unknown,
  schema: Record<string, unknown>,
  options: { filterOneOfErrors?: boolean } = {},
): { valid: boolean; errors: string[] } {
  const validator = createValidator();
  const validate = validator.compile(schema);
  const valid = validate(data);

  if (!valid && validate.errors) {
    const errors = options.filterOneOfErrors
      ? formatValidationErrors(validate.errors)
      : formatBasicErrors(validate.errors);

    // If all errors filtered out, consider valid
    if (errors.length === 0) {
      return { valid: true, errors: [] };
    }

    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

/**
 * Resolve schema path from $schema reference
 */
function resolveSchemaPath(schemaRef: string, jsonFilePath: string): string | null {
  // Handle HTTP URLs
  if (schemaRef.startsWith('http')) {
    if (schemaRef.includes('scaffoldfy/schema')) {
      return path.join(dirname, '..', '..', 'schema', 'scaffoldfy.schema.json');
    }
    return null;
  }

  // Handle relative paths
  if (schemaRef.startsWith('../') || schemaRef.startsWith('./')) {
    return path.resolve(path.dirname(jsonFilePath), schemaRef);
  }

  // Absolute path or other format
  return schemaRef;
}

/**
 * Format basic validation errors
 */
function formatBasicErrors(errors: ErrorObject[]): string[] {
  return errors.map((err) => {
    const errorPath = err.instancePath || 'root';
    return `${errorPath}: ${err.message}`;
  });
}

/**
 * Format Ajv validation errors into human-readable messages
 * Filters out certain oneOf errors that are expected due to schema design
 */
function formatValidationErrors(errors: ErrorObject[]): string[] {
  // Filter out oneOf errors where there are passing schemas
  // This happens with template/create configs which have identical structure
  const filteredErrors = errors.filter((error) => {
    if (error.keyword === 'oneOf') {
      const params = error.params as { passingSchemas?: number[] };
      // If there are passing schemas, this is likely a template/create ambiguity
      // which is acceptable since they have the same structure
      if (params.passingSchemas && params.passingSchemas.length > 0) {
        return false;
      }
    }
    // Also filter out "required" errors that are siblings of oneOf errors
    // These are noise from oneOf trying all branches
    if (error.keyword === 'required') {
      const oneOfError = errors.find(
        (e) => e.keyword === 'oneOf' && e.instancePath === error.instancePath,
      );
      if (oneOfError) {
        const params = oneOfError.params as { passingSchemas?: number[] };
        if (params.passingSchemas && params.passingSchemas.length > 0) {
          return false;
        }
      }
    }
    return true;
  });

  return filteredErrors.map((error) => {
    const errorPath = error.instancePath || 'root';
    const message = error.message ?? 'Unknown error';

    // Build a more descriptive error message based on error type
    switch (error.keyword) {
      case 'required': {
        const missingProp = String(error.params['missingProperty'] ?? 'unknown');
        return `${errorPath}: Missing required property "${missingProp}"`;
      }
      case 'type': {
        const expectedType = String(error.params['type'] ?? 'unknown');
        return `${errorPath}: Expected type "${expectedType}", received "${typeof error.data}"`;
      }
      case 'enum': {
        const allowedValues = error.params['allowedValues'] as unknown[];
        const valuesStr = Array.isArray(allowedValues)
          ? allowedValues.join(', ')
          : String(allowedValues);
        return `${errorPath}: ${message}. Allowed values: ${valuesStr}`;
      }
      case 'pattern': {
        const { pattern } = error.params as { pattern: unknown };
        return `${errorPath}: ${message}. Value must match pattern: ${String(pattern)}`;
      }
      case 'oneOf':
        return `${errorPath}: ${message}. Configuration must match exactly one of the allowed schemas`;
      case 'additionalProperties': {
        const additionalProp = String(error.params['additionalProperty'] ?? 'unknown');
        return `${errorPath}: ${message}. Unknown property: "${additionalProp}"`;
      }
      default:
        return `${errorPath}: ${message}`;
    }
  });
}

/**
 * Display validation errors in a user-friendly format
 */
export function displayValidationErrors(errors: string[]): void {
  log('❌ Schema validation failed:', 'error');
  log('', 'error');
  log('The following validation errors were found:', 'error');
  log('', 'error');

  for (const error of errors) {
    log(`  • ${error}`, 'error');
  }

  log('', 'error');
  log('Please fix these errors in your template configuration file.', 'error');
  log('', 'error');
  log(
    'For schema documentation, see: https://github.com/pixpilot/scaffoldfy/tree/main/packages/scaffoldfy/schema',
    'info',
  );
}

/**
 * Validate a JSON file against its $schema property
 * For validating JSON files with $schema property
 *
 * @param filePath - Path to the JSON file to validate
 * @returns Validation result with success status and any errors
 */
export function validateScaffoldfyJsonFile(filePath: string): {
  valid: boolean;
  errors?: string[];
} {
  // Always resolve filePath to absolute path for robust handling
  const resolvedFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  try {
    const content = fs.readFileSync(resolvedFilePath, 'utf-8');
    const data = JSON.parse(content) as unknown;

    // Check if file has $schema property
    // eslint-disable-next-line ts/strict-boolean-expressions
    if (!data || typeof data !== 'object' || !('$schema' in data)) {
      return { valid: true }; // Skip validation if no schema reference
    }

    const schemaRef = (data as Record<string, unknown>)['$schema'];
    if (typeof schemaRef !== 'string') {
      return { valid: true }; // Skip if schema is not a string
    }

    const schemaPath = resolveSchemaPath(schemaRef, resolvedFilePath);
    if (schemaPath === null || !fs.existsSync(schemaPath)) {
      console.warn(`Schema file not found: ${schemaPath}`);
      return { valid: true }; // Skip if schema file doesn't exist
    }

    const schema = loadSchema(schemaPath);
    return validateAgainstSchema(data, schema);
  } catch (error) {
    return {
      valid: false,
      errors: [
        `Failed to parse JSON file ${resolvedFilePath}: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

/**
 * Validate a tasks configuration object against the JSON schema
 * For validating in-memory task configurations
 *
 * @param tasksConfig - The full tasks configuration object to validate
 * @param options - Validation options
 * @param options.silent - If true, suppress error output to console
 * @returns Validation result with success status and any errors
 */
export function validateTasksSchema(
  tasksConfig: unknown,
  options: { silent?: boolean } = {},
): { valid: boolean; errors: string[] } {
  try {
    const schemaPath = path.join(dirname, '..', '..', 'schema', 'scaffoldfy.schema.json');
    const schema = loadSchema(schemaPath);

    const result = validateAgainstSchema(tasksConfig, schema, {
      filterOneOfErrors: true,
    });

    if (!result.valid && !options.silent) {
      displayValidationErrors(result.errors);
    }

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown error occurred during schema validation';

    if (!options.silent) {
      log('❌ Schema validation error:', 'error');
      log(`  ${errorMessage}`, 'error');
    }

    return { valid: false, errors: [errorMessage] };
  }
}
