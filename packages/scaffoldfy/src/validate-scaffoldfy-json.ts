#!/usr/bin/env node

/**
 * JSON Schema Validator for scaffoldfy templates
 * Validates JSON files against their referenced schemas
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { Command } from 'commander';

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
function validateJsonFile(filePath: string): { valid: boolean; errors?: string[] } {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
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
        schemaPath = path.join(dirname, '..', 'schema', 'scaffoldfy.schema.json');
      } else {
        return { valid: true }; // Skip external schemas we don't know about
      }
    } else if (schemaRef.startsWith('../') || schemaRef.startsWith('./')) {
      // Relative path - resolve relative to the JSON file's directory
      schemaPath = path.resolve(path.dirname(filePath), schemaRef);
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
        `Failed to parse JSON file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

/**
 * Find all JSON files in a directory recursively
 */
function findJsonFiles(dirPath: string): string[] {
  const jsonFiles: string[] = [];

  function traverse(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and other common directories
        if (
          entry.name !== 'node_modules' &&
          entry.name !== '.git' &&
          !entry.name.startsWith('.')
        ) {
          traverse(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        jsonFiles.push(fullPath);
      }
    }
  }

  traverse(dirPath);
  return jsonFiles;
}

/**
 * Main function
 */
function main() {
  const program = new Command();

  program
    .name('validate-scaffoldfy-json')
    .description('Validate scaffoldfy JSON files against their schemas')
    .version('1.0.0')
    .option('-f, --file <path>', 'Path to a JSON file to validate')
    .option('-d, --dir <path>', 'Path to a directory to scan for JSON files')
    .parse(process.argv);

  const options = program.opts<{ file?: string; dir?: string }>();

  let filesToValidate: string[] = [];

  if (options.file !== undefined && options.file !== '') {
    filesToValidate = [options.file];
  } else if (options.dir !== undefined && options.dir !== '') {
    console.log(`Scanning directory: ${options.dir}`);
    filesToValidate = findJsonFiles(options.dir);
    console.log(`Found ${filesToValidate.length} JSON file(s)\n`);
  } else {
    console.error('Error: Please provide either --file or --dir option');
    program.help();
  }

  let hasErrors = false;

  for (const file of filesToValidate) {
    console.log(`Validating ${file}...`);
    const result = validateJsonFile(file);

    if (!result.valid) {
      hasErrors = true;
      console.error(`❌ ${file} validation failed:`);
      if (result.errors) {
        for (const error of result.errors) {
          console.error(`  ${error}`);
        }
      }
    } else {
      console.log(`✅ ${file} is valid`);
    }
  }

  if (hasErrors) {
    process.exit(1);
  }

  console.log('\n✅ All files validated successfully!');
}

main();
