/**
 * Resolve variables one by one into a context
 */

/* eslint-disable no-await-in-loop */
import type { CurrentConfigurationContext, VariableDefinition } from '../types';
import { collectVariables } from './collect-variables';
import { resolveAllVariableValues } from './resolve-all-variable-values';

/**
 * Resolve variables in declaration order, applying each one's transformers and
 * merging it into the context before the next, so a variable can build on the
 * transformed value of an earlier one (`{{featurePascal}}Screen`).
 * @param variables - Variable definitions, in declaration order
 * @param context - Configuration context; receives the resolved values
 * @returns The resolved values
 */
export async function resolveVariablesIntoContext(
  variables: VariableDefinition[],
  context: CurrentConfigurationContext,
): Promise<Record<string, unknown>> {
  const values: Record<string, unknown> = {};
  for (const variable of variables) {
    const resolved = await resolveAllVariableValues([variable], context);
    const collected = await collectVariables([variable], resolved, context);
    Object.assign(context, collected);
    Object.assign(values, collected);
  }
  return values;
}
