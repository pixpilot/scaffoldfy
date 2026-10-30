/**
 * Find variables that read prompt answers, so they resolve after prompts
 */

import type { VariableDefinition } from '../types';

const PLACEHOLDER_PATTERN = /\{\{(?<placeholder>[^{}]+)\}\}/gu;
const IDENTIFIER_PATTERN = /[A-Z_$][\w$]*/giu;

/**
 * Every string inside a variable's value config (interpolate values, exec-file
 * args, conditional branches...)
 */
function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(collectStrings);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

/**
 * Names used inside `{{...}}` placeholders, e.g. `{{name}}` or `{{#if name}}`
 */
function referencedNames(variable: VariableDefinition): Set<string> {
  const names = new Set<string>();
  for (const text of collectStrings(variable.value)) {
    for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
      for (const [name] of (match.groups?.['placeholder'] ?? '').matchAll(
        IDENTIFIER_PATTERN,
      )) {
        names.add(name);
      }
    }
  }
  return names;
}

/**
 * Ids of variables whose value uses a prompt answer through a `{{placeholder}}`,
 * directly or through another such variable. Resolving them before prompts would
 * interpolate empty strings, so they are resolved after prompts instead.
 * @param variables - Variable definitions
 * @param promptIds - Ids of the prompts collected after the first variable pass
 * @returns Ids of the prompt-dependent variables
 */
export function findPromptDependentVariables(
  variables: VariableDefinition[],
  promptIds: Iterable<string>,
): Set<string> {
  const dependencies = new Set(promptIds);
  const dependent = new Set<string>();
  const references = new Map(
    variables.map((variable) => [variable.id, referencedNames(variable)]),
  );

  // Repeat until no new variable is found, to follow chains of variables.
  let changed = true;
  while (changed) {
    changed = false;
    for (const variable of variables) {
      const names = references.get(variable.id) ?? new Set<string>();
      if (
        !dependent.has(variable.id) &&
        [...names].some((name) => dependencies.has(name))
      ) {
        dependent.add(variable.id);
        dependencies.add(variable.id);
        changed = true;
      }
    }
  }

  return dependent;
}

/**
 * Whether a variable's value is a `conditional` config
 */
export function isConditionalVariable(variable: VariableDefinition): boolean {
  const { value } = variable;
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (value as { type?: string }).type === 'conditional'
  );
}
