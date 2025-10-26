#!/usr/bin/env node

/**
 * JSON Schema Validator for scaffoldfy templates
 * Validates JSON files against their referenced schemas
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { Command } from 'commander';
import { validateScaffoldfyJsonFile } from './validate-scaffoldfy-json';

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
    const result = validateScaffoldfyJsonFile(file);

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

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
