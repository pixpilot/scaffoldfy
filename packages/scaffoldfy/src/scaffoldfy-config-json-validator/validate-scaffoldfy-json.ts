import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/**
 * Create and configure Ajv instance
 */
function createValidator(): Ajv {
  return new Ajv({
    allErrors: true,
    verbose: true,
    strict: false, // Allow unknown keywords like instanceof
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
 * Validate a JSON file against its schema
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

    let schemaPath: string;

    // Handle different schema reference formats
    if (schemaRef.startsWith('http')) {
      // For HTTP URLs, try to resolve to local schema
      if (schemaRef.includes('scaffoldfy/schema')) {
        schemaPath = path.join(dirname, '..', '..', 'schema', 'scaffoldfy.schema.json');
      } else {
        return { valid: true }; // Skip external schemas we don't know about
      }
    } else if (schemaRef.startsWith('../') || schemaRef.startsWith('./')) {
      // Relative path - resolve relative to the JSON file's directory
      schemaPath = path.resolve(path.dirname(resolvedFilePath), schemaRef);
    } else {
      // Absolute path or other format
      schemaPath = schemaRef;
    }

    if (!fs.existsSync(schemaPath)) {
      console.warn(`Schema file not found: ${schemaPath}`);
      return { valid: true }; // Skip if schema file doesn't exist
    }

    const schema = loadSchema(schemaPath);
    const validator = createValidator();
    const validate = validator.compile(schema);
    const valid = validate(data);

    if (!valid) {
      const errors =
        validate.errors?.map((err) => {
          const errorPath = err.instancePath || 'root';
          return `${errorPath}: ${err.message}`;
        }) || [];
      return { valid: false, errors };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      errors: [
        `Failed to parse JSON file ${resolvedFilePath}: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}
