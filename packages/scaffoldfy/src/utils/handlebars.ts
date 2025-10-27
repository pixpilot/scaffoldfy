/**
 * Utility functions for template initialization
 */

import type { InitConfig } from '../types.js';
import fs from 'node:fs';
import path from 'node:path';

import process from 'node:process';
import Handlebars from 'handlebars';
import { ConfigurationFileNotFoundError } from '../errors/config.js';
import { log } from './logger.js';

// Re-export logger functions for convenience
export {
  error as logError,
  info as logInfo,
  success as logSuccess,
  warn as logWarn,
} from './logger.js';

/**
 * Compile a template file using Handlebars
 */
export function compileHandlebarsTemplateFile(
  templatePath: string,
  config: InitConfig,
): string {
  try {
    const absolutePath = path.isAbsolute(templatePath)
      ? templatePath
      : path.join(process.cwd(), templatePath);

    if (!fs.existsSync(absolutePath)) {
      throw ConfigurationFileNotFoundError.forPath(templatePath);
    }

    const templateContent = fs.readFileSync(absolutePath, 'utf-8');
    return compileHandlebarsTemplate(templateContent, config);
  } catch (error) {
    log(`Failed to read template file: ${templatePath}`, 'error');
    if (error instanceof Error) {
      log(`  Error: ${error.message}`, 'error');
    }
    throw error;
  }
}

/**
 * Compile a template string using Handlebars
 */
export function compileHandlebarsTemplate(template: string, config: InitConfig): string {
  try {
    const compiledTemplate = Handlebars.compile(template);
    return compiledTemplate(config);
  } catch (error) {
    log('Failed to compile Handlebars template', 'error');
    if (error instanceof Error) {
      log(`  Error: ${error.message}`, 'error');
    }
    throw error;
  }
}
