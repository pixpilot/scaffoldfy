import type { CurrentConfigurationContext, ScaffoldfyConfiguration } from '../types';
import process from 'node:process';
import {
  collectVariables,
  resolveAllVariableValues,
  validateVariables,
} from '../variables';

/**
 * Process variables for a single config
 */
export async function processConfigVariables(
  config: ScaffoldfyConfiguration,
  context: CurrentConfigurationContext,
): Promise<void> {
  const configVariables = config.variables ?? [];
  if (configVariables.length > 0) {
    // Validate variables
    const variableErrors = validateVariables(configVariables);
    if (variableErrors.length > 0) {
      console.error('❌ Variable validation errors:');
      variableErrors.forEach((err) => console.error(`  - ${err}`));
      process.exit(1);
    }

    // Resolve non-conditional variables first
    const resolvedVariableValues = await resolveAllVariableValues(
      configVariables,
      context,
      { skipConditional: true },
    );

    // Collect and merge into config
    const variableValues = await collectVariables(
      configVariables,
      resolvedVariableValues,
      context,
    );
    Object.assign(context, variableValues);

    // Resolve conditional variables
    const conditionalVariables = configVariables.filter((v) => {
      if (typeof v.value === 'object' && v.value !== null && !Array.isArray(v.value)) {
        const valueConfig = v.value as { type?: string };
        return valueConfig.type === 'conditional';
      }
      return false;
    });

    if (conditionalVariables.length > 0) {
      const resolvedConditionalValues = await resolveAllVariableValues(
        conditionalVariables,
        context,
      );
      const conditionalValues = await collectVariables(
        conditionalVariables,
        resolvedConditionalValues,
        context,
      );
      Object.assign(context, conditionalValues);
    }
  }
}
