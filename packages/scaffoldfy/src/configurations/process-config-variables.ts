import type { CurrentConfigurationContext, ScaffoldfyConfiguration } from '../types';
import process from 'node:process';
import {
  collectVariables,
  findPromptDependentVariables,
  isConditionalVariable,
  resolveAllVariableValues,
  resolveVariablesIntoContext,
  validateVariables,
} from '../variables';

/**
 * Ids of this config's variables that interpolate its prompt answers
 */
function getPromptDependentIds(config: ScaffoldfyConfiguration): Set<string> {
  return findPromptDependentVariables(
    config.variables ?? [],
    (config.prompts ?? []).map((prompt) => prompt.id),
  );
}

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

    // Variables that interpolate prompt answers wait until prompts are collected
    const promptDependentIds = getPromptDependentIds(config);
    const readyVariables = configVariables.filter(
      (variable) => !promptDependentIds.has(variable.id),
    );

    // Resolve non-conditional variables first
    const resolvedVariableValues = await resolveAllVariableValues(
      readyVariables,
      context,
      { skipConditional: true },
    );

    // Collect and merge into config
    const variableValues = await collectVariables(
      readyVariables,
      resolvedVariableValues,
      context,
    );
    Object.assign(context, variableValues);

    // Resolve conditional variables once before prompts are collected.
    // Some prompt enabled/required conditions may reference these values.
    await resolveVariablesIntoContext(
      readyVariables.filter(isConditionalVariable),
      context,
    );
  }
}

/**
 * Re-resolve conditional variables, and resolve variables that interpolate prompt
 * answers, for a single config using the latest context.
 * This should be called after prompts are collected.
 */
export async function processConfigConditionalVariables(
  config: ScaffoldfyConfiguration,
  context: CurrentConfigurationContext,
): Promise<void> {
  const configVariables = config.variables ?? [];
  if (configVariables.length === 0) {
    return;
  }

  const promptDependentIds = getPromptDependentIds(config);
  await resolveVariablesIntoContext(
    configVariables.filter(
      (variable) =>
        isConditionalVariable(variable) || promptDependentIds.has(variable.id),
    ),
    context,
  );
}
