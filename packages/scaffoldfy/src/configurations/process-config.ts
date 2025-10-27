import type { CurrentConfigurationContext, ScaffoldfyConfiguration } from '../types';
import { evaluateEnabledAsync, info } from '../utils';

import { processConfigPrompts } from './process-config-prompts';
import { processConfigVariables } from './process-config-variables';

/**
 * Process a single config's variables and prompts
 */
export async function processConfig(
  config: ScaffoldfyConfiguration,
  context: CurrentConfigurationContext,
): Promise<boolean> {
  // Check if this config is enabled
  const configIsEnabled = await evaluateEnabledAsync(config.enabled, context);

  if (!configIsEnabled) {
    info(`⊘ Config "${config.name}" is disabled - skipping`);
    return false;
  }

  // Process variables
  await processConfigVariables(config, context);

  // Process prompts
  await processConfigPrompts(config, context);

  // Re-check config enabled condition after variables and prompts are resolved
  const configStillEnabled = await evaluateEnabledAsync(config.enabled, context);
  if (!configStillEnabled) {
    info(
      `⊘ Config "${config.name}" became disabled after variable/prompt resolution - skipping tasks`,
    );
    return false;
  }

  return true;
}
