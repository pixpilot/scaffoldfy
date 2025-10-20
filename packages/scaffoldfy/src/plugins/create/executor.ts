/**
 * create plugin executor
 */

import type { InitConfig } from '../../types.js';
import type { CreateConfig } from './types.js';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import {
  compileHandlebarsTemplateFile,
  evaluateCondition,
  interpolateTemplate,
  log,
} from '../../utils.js';

const writeFile = promisify(fs.writeFile);

/**
 * Execute create task - creates a file but doesn't overwrite if it exists
 */
export async function executeCreate(
  config: CreateConfig,
  initConfig: InitConfig,
): Promise<void> {
  // Check condition if specified
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      log('Condition not met, skipping create task', 'info');
      return;
    }
  }

  const filePath = path.join(process.cwd(), config.file);

  // Check if file already exists - skip if it does
  if (fs.existsSync(filePath)) {
    log(`File already exists, skipping: ${config.file}`, 'info');
    return;
  }

  // Validate that either template or templateFile is provided
  const hasInlineTemplate = config.template != null && config.template !== '';
  const hasTemplateFile = config.templateFile != null && config.templateFile !== '';

  if (!hasInlineTemplate && !hasTemplateFile) {
    throw new Error(
      'Create task requires either "template" (inline) or "templateFile" (file path) to be specified',
    );
  }

  // Both template and templateFile cannot be specified together
  if (hasInlineTemplate && hasTemplateFile) {
    throw new Error(
      'Create task cannot have both "template" and "templateFile" specified. Use one or the other.',
    );
  }

  let content: string;

  // Check if we should use Handlebars (for .hbs files)
  const shouldUseHandlebars = hasTemplateFile && config.templateFile!.endsWith('.hbs');

  if (shouldUseHandlebars) {
    // Read and compile external template file with Handlebars
    content = compileHandlebarsTemplateFile(config.templateFile!, initConfig);
  } else if (hasTemplateFile) {
    // Read external template file and use simple interpolation
    const templateFilePath = config.templateFile!;
    const templatePath = path.isAbsolute(templateFilePath)
      ? templateFilePath
      : path.join(process.cwd(), templateFilePath);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templateFilePath}`);
    }

    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    content = interpolateTemplate(templateContent, initConfig);
  } else {
    // Use simple interpolation on inline template
    content = interpolateTemplate(config.template!, initConfig);
  }

  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await writeFile(filePath, content);
  log(`Created file: ${config.file}`, 'success');
}
