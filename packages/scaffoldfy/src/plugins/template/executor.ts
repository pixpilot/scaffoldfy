/**
 * template plugin executor
 */

import type { InitConfig, TaskDefinition } from '../../types.js';
import type { TemplateConfig } from './types.js';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import {
  fetchTemplateFile,
  resolveTemplateFilePath,
} from '../../template-inheritance.js';
import { evaluateCondition, interpolateTemplate, log } from '../../utils.js';

const writeFile = promisify(fs.writeFile);

/**
 * Execute template task
 */
export async function executeTemplate(
  config: TemplateConfig,
  initConfig: InitConfig,
  task?: TaskDefinition,
): Promise<void> {
  // Check condition if specified
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      log('Condition not met, skipping template task', 'info');
      return;
    }
  }

  const filePath = path.join(process.cwd(), config.file);

  // Validate that either template or templateFile is provided
  const hasInlineTemplate = config.template != null && config.template !== '';
  const hasTemplateFile = config.templateFile != null && config.templateFile !== '';

  if (!hasInlineTemplate && !hasTemplateFile) {
    throw new Error(
      'Template task requires either "template" (inline) or "templateFile" (file path) to be specified',
    );
  }

  // Both template and templateFile cannot be specified together
  if (hasInlineTemplate && hasTemplateFile) {
    throw new Error(
      'Template task cannot have both "template" and "templateFile" specified. Use one or the other.',
    );
  }

  let content: string;

  // Check if we should use Handlebars (for .hbs files)
  const shouldUseHandlebars = hasTemplateFile && config.templateFile!.endsWith('.hbs');

  if (shouldUseHandlebars) {
    // Resolve the templateFile path relative to the task's source
    const resolvedTemplatePath = resolveTemplateFilePath(
      config.templateFile!,
      task?.$sourceUrl,
    );

    // Fetch the template file (from URL or local filesystem)
    const templateContent = await fetchTemplateFile(resolvedTemplatePath);

    // Compile with Handlebars
    const Handlebars = await import('handlebars');
    const template = Handlebars.default.compile(templateContent);
    content = template(initConfig);
  } else if (hasTemplateFile) {
    // Resolve the templateFile path relative to the task's source
    const resolvedTemplatePath = resolveTemplateFilePath(
      config.templateFile!,
      task?.$sourceUrl,
    );

    // Fetch the template file (from URL or local filesystem)
    const templateContent = await fetchTemplateFile(resolvedTemplatePath);

    // Use simple interpolation
    content = interpolateTemplate(templateContent, initConfig);
  } else {
    // Use simple interpolation on inline template
    content = interpolateTemplate(config.template!, initConfig);
  }

  await writeFile(filePath, content);
}
