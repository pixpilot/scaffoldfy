/**
 * Content modification task diffs
 *
 * Functions for generating diffs for tasks that modify file content.
 */

import type {
  CurrentConfigurationContext,
  RegexReplaceConfig,
  ReplaceInFileConfig,
  UpdateJsonConfig,
} from '../types';

import { evaluateCondition, interpolateTemplate } from '../utils';
import { setNestedProperty } from '../utils/object';
import { colors, fileExists, generateDiff, JSON_INDENT, readFileContent } from './utils';

/**
 * Get diff for update-json task
 */
export async function getUpdateJsonDiff(
  config: UpdateJsonConfig,
  initConfig: CurrentConfigurationContext,
): Promise<string> {
  // Check condition
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      return `${colors.yellow}⊘ Condition not met - task would be skipped${colors.reset}`;
    }
  }

  const filePath = config.file;

  if (!fileExists(filePath)) {
    return `${colors.red}✗ File not found: ${config.file}${colors.reset}`;
  }

  try {
    const content = await readFileContent(filePath);
    const json = JSON.parse(content) as Record<string, unknown>;
    const originalJson = { ...json };

    // Apply updates to a copy
    function interpolateValue(value: unknown): unknown {
      if (typeof value === 'string') {
        return interpolateTemplate(value, initConfig);
      }
      if (Array.isArray(value)) {
        return value.map((item) => interpolateValue(item));
      }
      if (value != null && typeof value === 'object') {
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) {
          result[k] = interpolateValue(v);
        }
        return result;
      }
      return value;
    }

    for (const [key, value] of Object.entries(config.updates)) {
      const interpolatedValue = interpolateValue(value);
      if (key.includes('.')) {
        setNestedProperty(json, key, interpolatedValue);
      } else {
        json[key] = interpolatedValue;
      }
    }

    const originalContent = JSON.stringify(originalJson, null, JSON_INDENT);
    const modifiedContent = JSON.stringify(json, null, JSON_INDENT);

    if (originalContent === modifiedContent) {
      return `${colors.cyan}→ No changes${colors.reset}`;
    }

    const diff = generateDiff(originalContent, modifiedContent);
    return `${colors.blue}File: ${config.file}${colors.reset}\n${diff.join('\n')}`;
  } catch (error) {
    return `${colors.red}✗ Error: ${
      error instanceof Error ? error.message : String(error)
    }${colors.reset}`;
  }
}

/**
 * Get diff for regex-replace task
 */
export async function getRegexReplaceDiff(
  config: RegexReplaceConfig,
  initConfig: CurrentConfigurationContext,
): Promise<string> {
  // Check condition
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      return `${colors.yellow}⊘ Condition not met - task would be skipped${colors.reset}`;
    }
  }

  const filePath = config.file;

  if (!fileExists(filePath)) {
    return `${colors.red}✗ File not found: ${config.file}${colors.reset}`;
  }

  try {
    const content = await readFileContent(filePath);
    const regex = new RegExp(config.pattern, config.flags ?? 'g');
    const replacement = interpolateTemplate(config.replacement, initConfig);
    const modifiedContent = content.replace(regex, replacement);

    if (content === modifiedContent) {
      return `${colors.cyan}→ No matches found${colors.reset}`;
    }

    const diff = generateDiff(content, modifiedContent);
    return `${colors.blue}File: ${config.file}${colors.reset}\n${diff.join('\n')}`;
  } catch (error) {
    return `${colors.red}✗ Error: ${
      error instanceof Error ? error.message : String(error)
    }${colors.reset}`;
  }
}

/**
 * Get diff for replace-in-file task
 */
export async function getReplaceInFileDiff(
  config: ReplaceInFileConfig,
  initConfig: CurrentConfigurationContext,
): Promise<string> {
  // Check condition
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      return `${colors.yellow}⊘ Condition not met - task would be skipped${colors.reset}`;
    }
  }

  const filePath = config.file;

  if (!fileExists(filePath)) {
    return `${colors.red}✗ File not found: ${config.file}${colors.reset}`;
  }

  try {
    let content = await readFileContent(filePath);
    const originalContent = content;

    for (const { find, replace } of config.replacements) {
      const findInterpolated = interpolateTemplate(find, initConfig);
      const replaceInterpolated = interpolateTemplate(replace, initConfig);
      content = content.replace(findInterpolated, replaceInterpolated);
    }

    if (originalContent === content) {
      return `${colors.cyan}→ No changes${colors.reset}`;
    }

    const diff = generateDiff(originalContent, content);
    return `${colors.blue}File: ${config.file}${colors.reset}\n${diff.join('\n')}`;
  } catch (error) {
    return `${colors.red}✗ Error: ${
      error instanceof Error ? error.message : String(error)
    }${colors.reset}`;
  }
}
