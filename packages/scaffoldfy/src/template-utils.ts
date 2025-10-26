/**
 * Template utilities for resolving and processing template content
 *
 * This module provides common utilities for working with templates,
 * including validation, resolution, and content processing.
 */

import type { InitConfig, TaskDefinition } from './types.js';
import { fetchConfigurationFile } from './config-inheritance.js';
import { interpolateTemplate } from './utils';
import { resolveFilePath } from './utils/resolve-file-path.js';

/**
 * Configuration for template/templateFile properties
 */
export interface TemplateSource {
  template?: string;
  templateFile?: string;
}

/**
 * Result of template validation
 */
export interface TemplateValidationResult {
  isValid: boolean;
  hasInlineTemplate: boolean;
  hasTemplateFile: boolean;
  error?: string;
}

/**
 * Options for processing templates
 */
export interface ProcessTemplateOptions {
  /** Enable Handlebars compilation for .hbs files */
  enableHandlebars?: boolean;
  /** Source URL for resolving relative template paths */
  sourceUrl?: string;
}

/**
 * Check if a config has an inline template
 * @param config - Configuration object with potential template property
 * @returns True if inline template is present and non-empty
 */
export function hasInlineTemplate(config: TemplateSource): boolean {
  return config.template != null && config.template !== '';
}

/**
 * Check if a config has a template file reference
 * @param config - Configuration object with potential templateFile property
 * @returns True if templateFile is present and non-empty
 */
export function hasTemplateFile(config: TemplateSource): boolean {
  return config.templateFile != null && config.templateFile !== '';
}

/**
 * Check if a template file should be processed with Handlebars
 * @param templateFile - Path to the template file
 * @returns True if the file has .hbs extension
 */
export function shouldUseHandlebars(templateFile: string): boolean {
  return templateFile.endsWith('.hbs');
}

/**
 * Validate template configuration
 * @param config - Configuration object to validate
 * @returns Validation result with details
 */
export function validateTemplateConfig(config: TemplateSource): TemplateValidationResult {
  const inline = hasInlineTemplate(config);
  const file = hasTemplateFile(config);

  // Must have either template or templateFile
  if (!inline && !file) {
    return {
      isValid: false,
      hasInlineTemplate: inline,
      hasTemplateFile: file,
      error:
        'Template configuration requires either "template" (inline) or "templateFile" (file path) to be specified',
    };
  }

  // Cannot have both template and templateFile
  if (inline && file) {
    return {
      isValid: false,
      hasInlineTemplate: inline,
      hasTemplateFile: file,
      error:
        'Template configuration cannot have both "template" and "templateFile" specified. Use one or the other.',
    };
  }

  return {
    isValid: true,
    hasInlineTemplate: inline,
    hasTemplateFile: file,
  };
}

/**
 * Process a template and return the rendered content
 * @param config - Template configuration
 * @param initConfig - Initialization config with variable values
 * @param task - Optional task definition for $sourceUrl resolution
 * @param options - Processing options
 * @returns Processed template content
 */
export async function processTemplate(
  config: TemplateSource,
  initConfig: InitConfig,
  task?: TaskDefinition,
  options: ProcessTemplateOptions = {},
): Promise<string> {
  const { enableHandlebars = true, sourceUrl = task?.$sourceUrl } = options;

  const inline = hasInlineTemplate(config);
  const file = hasTemplateFile(config);

  // Use inline template
  if (inline) {
    return interpolateTemplate(config.template!, initConfig);
  }

  // Use template file
  if (file) {
    const templateFile = config.templateFile!;
    const useHandlebars = enableHandlebars && shouldUseHandlebars(templateFile);

    // Resolve the templateFile path relative to the task's source
    const resolvedTemplatePath = resolveFilePath(templateFile, sourceUrl);

    // Fetch the template file (from URL or local filesystem)
    const templateContent = await fetchConfigurationFile(resolvedTemplatePath);

    if (useHandlebars) {
      // Compile with Handlebars
      const Handlebars = await import('handlebars');
      const template = Handlebars.default.compile(templateContent);
      return template(initConfig);
    }

    // Use simple interpolation
    return interpolateTemplate(templateContent, initConfig);
  }

  throw new Error('No template content available');
}

/**
 * Get a description of the template source for display purposes
 * @param config - Template configuration
 * @returns Human-readable description of the template source
 */
export function getTemplateSourceDescription(config: TemplateSource): string {
  if (hasInlineTemplate(config)) {
    return 'inline template';
  }
  if (hasTemplateFile(config)) {
    return `template file: ${config.templateFile}`;
  }
  return 'no template source';
}
