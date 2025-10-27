import type { InitConfig, TaskDefinition } from '../types';
import type { ProcessTemplateOptions, TemplateSource } from './template-utils';
import { fetchConfigurationFile } from '../configurations';
import { interpolateTemplate, resolveFilePath } from '../utils';
import {
  hasInlineTemplate,
  hasTemplateFile,
  shouldUseHandlebars,
} from './template-utils';

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
