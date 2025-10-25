/**
 * Schema validation for template tasks configuration
 * Uses JSON Schema validation via Ajv to validate task configurations
 */

import type { ErrorObject } from 'ajv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { log } from './utils.js';

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
 * Load the tasks schema from the schema directory
 */
function loadTasksSchema(): Record<string, unknown> {
  const schemaPath = path.join(dirname, '..', 'schema', 'scaffoldfy.schema.json');

  try {
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    return JSON.parse(schemaContent) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      `Failed to load tasks schema from ${schemaPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
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
 * Validate a tasks configuration object against the JSON schema
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
    const ajv = createValidator();
    const schema = loadTasksSchema();

    const validate = ajv.compile(schema);
    const valid = validate(tasksConfig);

    if (!valid && validate.errors) {
      const formattedErrors = formatValidationErrors(validate.errors);

      // If all errors were filtered out (e.g., acceptable oneOf ambiguities),
      // consider the validation as passed
      if (formattedErrors.length === 0) {
        return { valid: true, errors: [] };
      }

      if (!options.silent) {
        displayValidationErrors(formattedErrors);
      }

      return { valid: false, errors: formattedErrors };
    }

    return { valid: true, errors: [] };
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
