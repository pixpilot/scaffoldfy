/**
 * Transformer types for value transformation
 */

import type { DynamicBooleanValue } from '../types';

type BuiltInTransformerType =
  | 'lowercase'
  | 'uppercase'
  | 'trim'
  | 'slugify'
  | 'capitalize'
  | 'titlecase'
  | 'camelcase'
  | 'pascalcase'
  | 'snakecase'
  | 'kebabcase'
  | 'constantcase'
  | 'alphanumeric'
  | 'collapse-spaces'
  | 'remove-spaces'
  | 'urlencode'
  | 'dasherize'
  | 'underscore';

/**
 * Available transformer types
 */
export type TransformerType =
  | BuiltInTransformerType
  | 'regex'
  | 'computed'
  | 'custom'
  | 'chain';

/**
 * Base transformer interface
 */
export interface BaseTransformer {
  id: string;
  name?: string;
  description?: string;
  enabled?: DynamicBooleanValue; // Whether transformer should be applied (supports boolean or dynamic evaluation)
}

/**
 * Regex transformer - applies regex pattern replacement
 */
export interface RegexTransformer extends BaseTransformer {
  type: 'regex';
  config: {
    pattern: string;
    flags?: string;
    replacement: string;
  };
}

/**
 * Computed transformer - evaluates JavaScript expression
 */
export interface ComputedTransformer extends BaseTransformer {
  type: 'computed';
  config: {
    expression: string; // JavaScript expression that receives 'value' variable
  };
}

/**
 * Built-in transformers with standard behavior
 */
export interface BuiltInTransformer extends BaseTransformer {
  type: BuiltInTransformerType;
  config?: Record<string, unknown>; // Optional config for built-in transformers
}

/**
 * Custom transformer with handler function
 */
export interface CustomTransformer extends BaseTransformer {
  type: 'custom';
  config: {
    handler: string | ((value: unknown, context?: unknown) => unknown);
  };
}

/**
 * Chain transformer - executes multiple transformers in sequence
 */
export interface ChainTransformer extends BaseTransformer {
  type: 'chain';
  config: {
    transformers: string[]; // Array of transformer IDs to execute in sequence
  };
}

/**
 * Union type of all transformer types
 */
export type Transformer =
  | RegexTransformer
  | ComputedTransformer
  | BuiltInTransformer
  | CustomTransformer
  | ChainTransformer;
