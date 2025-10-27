import type { CurrentConfigurationContext, ScaffoldfyConfiguration } from '../types';
import process from 'node:process';
import { collectPrompts, resolveAllDefaultValues, validatePrompts } from '../prompts';

/**
 * Process prompts for a single config
 */
export async function processConfigPrompts(
  config: ScaffoldfyConfiguration,
  context: CurrentConfigurationContext,
): Promise<void> {
  const configPrompts = config.prompts ?? [];
  if (configPrompts.length > 0) {
    // Validate prompts
    const promptErrors = validatePrompts(configPrompts);
    if (promptErrors.length > 0) {
      console.error('❌ Prompt validation errors:');
      promptErrors.forEach((err) => console.error(`  - ${err}`));
      process.exit(1);
    }

    // Resolve default values
    const resolvedDefaults = await resolveAllDefaultValues(configPrompts, context);

    // Collect prompts
    const promptAnswers = await collectPrompts(configPrompts, resolvedDefaults, context);

    // Merge into config
    Object.assign(context, promptAnswers);
  }
}
