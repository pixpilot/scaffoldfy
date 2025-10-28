/**
 * Transformer Manager - handles registration and execution of value transformers
 */

import type { BuiltInTransformer, Transformer } from './types';
import {
  adaCase,
  camelCase,
  capitalCase,
  cobolCase,
  constantCase,
  dotNotation,
  kebabCase,
  lowerCase,
  pascalCase,
  pathCase,
  snakeCase,
  spaceCase,
  trainCase,
  upperCamelCase,
  upperCase,
} from 'case-anything';
import { TransformerError } from '../errors/other';
import { log } from '../utils';

/**
 * Context provided to transformers for evaluation
 */
export interface TransformerContext {
  [key: string]: unknown;
}

/**
 * Manages transformer registration and execution
 */
export class TransformerManager {
  private transformers: Map<string, Transformer> = new Map();

  constructor() {
    // Auto-register all built-in transformers
    this.registerBuiltInTransformers();
  }

  /**
   * Register all built-in transformers automatically
   */
  private registerBuiltInTransformers(): void {
    const builtInTransformers: BuiltInTransformer[] = [
      { id: 'lowercase', type: 'lowercase' },
      { id: 'uppercase', type: 'uppercase' },
      { id: 'trim', type: 'trim' },
      { id: 'slugify', type: 'slugify' },
      { id: 'capitalize', type: 'capitalize' },
      { id: 'titlecase', type: 'titlecase' },
      { id: 'camelcase', type: 'camelcase' },
      { id: 'pascalcase', type: 'pascalcase' },
      { id: 'snakecase', type: 'snakecase' },
      { id: 'kebabcase', type: 'kebabcase' },
      { id: 'constantcase', type: 'constantcase' },
      { id: 'alphanumeric', type: 'alphanumeric' },
      { id: 'collapse-spaces', type: 'collapse-spaces' },
      { id: 'capitalCase', type: 'capitalCase' },
      { id: 'remove-spaces', type: 'remove-spaces' },
      { id: 'urlencode', type: 'urlencode' },
      { id: 'dasherize', type: 'dasherize' },
      { id: 'underscore', type: 'underscore' },
      { id: 'adaCase', type: 'adaCase' },
      { id: 'cobolCase', type: 'cobolCase' },
      { id: 'dotNotation', type: 'dotNotation' },
      { id: 'pathCase', type: 'pathCase' },
      { id: 'spaceCase', type: 'spaceCase' },
      { id: 'trainCase', type: 'trainCase' },
      { id: 'upperCamelCase', type: 'upperCamelCase' },
    ];

    for (const transformer of builtInTransformers) {
      this.transformers.set(transformer.id, transformer);
    }
  }

  /**
   * Register a transformer
   */
  register(transformer: Transformer): void {
    if (this.transformers.has(transformer.id)) {
      log(
        `Transformer with id "${transformer.id}" is already registered. Overwriting.`,
        'warn',
      );
    }
    this.transformers.set(transformer.id, transformer);
  }

  /**
   * Register multiple transformers
   */
  registerAll(transformers: Transformer[]): void {
    for (const transformer of transformers) {
      this.register(transformer);
    }
  }

  /**
   * Get a transformer by ID
   */
  get(id: string): Transformer | undefined {
    return this.transformers.get(id);
  }

  /**
   * Check if a transformer exists
   */
  has(id: string): boolean {
    return this.transformers.has(id);
  }

  /**
   * Execute a single transformer on a value
   */
  async execute(
    transformerId: string,
    value: unknown,
    context: TransformerContext = {},
  ): Promise<unknown> {
    const transformer = this.transformers.get(transformerId);

    if (!transformer) {
      throw TransformerError.notFound(transformerId);
    }

    try {
      return await this.executeTransformer(transformer, value, context);
    } catch (error) {
      if (error instanceof TransformerError) {
        throw error;
      }
      throw TransformerError.executionFailed(
        transformerId,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Execute multiple transformers in sequence
   */
  /* eslint-disable no-await-in-loop */
  async executeChain(
    transformerIds: string[],
    value: unknown,
    context: TransformerContext = {},
  ): Promise<unknown> {
    let result = value;

    for (const transformerId of transformerIds) {
      result = await this.execute(transformerId, result, context);
    }

    return result;
  }
  /* eslint-enable no-await-in-loop */

  /**
   * Execute transformers based on string or array input
   */
  async apply(
    transformers: string[] | undefined,
    value: unknown,
    context: TransformerContext = {},
  ): Promise<unknown> {
    if (transformers === undefined) {
      return value;
    }

    return this.executeChain(transformers, value, context);
  }

  /**
   * Validate that all transformer IDs exist
   */
  validate(transformers: string[] | undefined): string[] {
    if (transformers === undefined) {
      return [];
    }

    const ids = transformers;
    const errors: string[] = [];

    for (const id of ids) {
      if (!this.has(id)) {
        errors.push(`Transformer "${id}" not found`);
      }
    }

    return errors;
  }

  /**
   * Execute a specific transformer based on its type
   */
  private async executeTransformer(
    transformer: Transformer,
    value: unknown,
    context: TransformerContext,
  ): Promise<unknown> {
    switch (transformer.type) {
      case 'regex':
        return this.executeRegex(transformer, value);

      case 'computed':
        return this.executeComputed(transformer, value, context);

      case 'lowercase':
        return this.executeLowercase(value);

      case 'uppercase':
        return this.executeUppercase(value);

      case 'trim':
        return this.executeTrim(value);

      case 'slugify':
        return this.executeSlugify(value);

      case 'capitalize':
        return this.executeCapitalize(value);

      case 'titlecase':
        return this.executeTitlecase(value);

      case 'capitalCase':
        return this.executeCapitalCase(value);

      case 'camelcase':
        return this.executeCamelcase(value);

      case 'pascalcase':
        return this.executePascalcase(value);

      case 'snakecase':
        return this.executeSnakecase(value);

      case 'kebabcase':
        return this.executeKebabcase(value);

      case 'constantcase':
        return this.executeConstantcase(value);

      case 'alphanumeric':
        return this.executeAlphanumeric(value);

      case 'collapse-spaces':
        return this.executeCollapseSpaces(value);

      case 'remove-spaces':
        return this.executeRemoveSpaces(value);

      case 'urlencode':
        return this.executeUrlencode(value);

      case 'dasherize':
        return this.executeDasherize(value);

      case 'underscore':
        return this.executeUnderscore(value);

      case 'adaCase':
        return this.executeAdaCase(value);

      case 'cobolCase':
        return this.executeCobolCase(value);

      case 'dotNotation':
        return this.executeDotNotation(value);

      case 'pathCase':
        return this.executePathCase(value);

      case 'spaceCase':
        return this.executeSpaceCase(value);

      case 'trainCase':
        return this.executeTrainCase(value);

      case 'upperCamelCase':
        return this.executeUpperCamelCase(value);

      case 'custom':
        return this.executeCustom(transformer, value, context);

      case 'chain':
        return this.executeChainTransformer(transformer, value, context);

      default: {
        // This should never happen with proper typing
        const unknownTransformer = transformer as { type: string; id: string };
        throw TransformerError.invalidType(
          unknownTransformer.id,
          unknownTransformer.type,
        );
      }
    }
  }

  /**
   * Execute regex transformer
   */
  private executeRegex(
    transformer: Transformer & { type: 'regex' },
    value: unknown,
  ): string {
    const stringValue = String(value);
    const { pattern, flags, replacement } = transformer.config;

    try {
      const regex = new RegExp(pattern, flags);
      return stringValue.replace(regex, replacement);
    } catch (error) {
      throw TransformerError.executionFailed(
        transformer.id,
        `Invalid regex pattern: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Execute computed transformer
   */
  private executeComputed(
    transformer: Transformer & { type: 'computed' },
    value: unknown,
    context: TransformerContext,
  ): unknown {
    const { expression } = transformer.config;

    try {
      // Create a function that evaluates the expression
      // Available variables: value, context, and all context properties
      // Note: Using Function constructor is intentional for dynamic expression evaluation
      // eslint-disable-next-line ts/no-implied-eval, no-new-func
      const func = new Function(
        'value',
        'context',
        ...Object.keys(context),
        `return ${expression}`,
      ) as (...args: unknown[]) => unknown;

      return func(value, context, ...Object.values(context));
    } catch (error) {
      throw TransformerError.executionFailed(
        transformer.id,
        `Expression evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Execute lowercase transformer
   */
  private executeLowercase(value: unknown): string {
    return lowerCase(String(value));
  }

  /**
   * Execute uppercase transformer
   */
  private executeUppercase(value: unknown): string {
    return upperCase(String(value));
  }

  /**
   * Execute trim transformer
   */
  private executeTrim(value: unknown): string {
    return String(value).trim();
  }

  /**
   * Execute slugify transformer
   * Converts string to URL-friendly slug format
   */
  private executeSlugify(value: unknown): string {
    return String(value)
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/gu, '-') // Replace spaces and underscores with hyphens
      .replace(/[^\w-]+/gu, '') // Remove non-word chars except hyphens
      .replace(/-{2,}/gu, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+/u, '') // Trim hyphens from start
      .replace(/-+$/u, ''); // Trim hyphens from end
  }

  /**
   * Execute custom transformer
   */
  private async executeCustom(
    transformer: Transformer & { type: 'custom' },
    value: unknown,
    context: TransformerContext,
  ): Promise<unknown> {
    const { handler } = transformer.config;

    if (typeof handler === 'function') {
      return handler(value, context);
    }

    // If handler is a string, it should be a path to a module
    // For now, we'll throw an error as module loading requires more setup
    throw TransformerError.executionFailed(
      transformer.id,
      'String-based custom handlers are not yet supported. Please use function handlers.',
    );
  }

  /**
   * Execute chain transformer
   */
  private async executeChainTransformer(
    transformer: Transformer & { type: 'chain' },
    value: unknown,
    context: TransformerContext,
  ): Promise<unknown> {
    const { transformers } = transformer.config;

    if (transformers.length === 0) {
      throw TransformerError.executionFailed(
        transformer.id,
        'Chain transformer must have at least one transformer',
      );
    }

    return this.executeChain(transformers, value, context);
  }

  /**
   * Execute capitalize transformer
   * Capitalizes the first letter of the string
   */
  private executeCapitalize(value: unknown): string {
    return capitalCase(String(value));
  }

  /**
   * Execute titlecase transformer
   * Capitalizes the first letter of each word
   */
  private executeTitlecase(value: unknown): string {
    // Convert to Capital Case (which handles word separation correctly)
    // but capitalCase might preserve separators, so we need a better approach
    const str = String(value);

    // Use kebabCase to normalize all formats, then convert to Title Case
    const normalized = kebabCase(str);

    // Split by hyphens and capitalize each word
    return normalized
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Execute camelcase transformer
   * Converts string to camelCase format
   */
  private executeCamelcase(value: unknown): string {
    return camelCase(String(value));
  }

  /**
   * Execute pascalcase transformer
   * Converts string to PascalCase format
   */
  private executePascalcase(value: unknown): string {
    return pascalCase(String(value));
  }

  /**
   * Execute snakecase transformer
   * Converts string to snake_case format
   */
  private executeSnakecase(value: unknown): string {
    return snakeCase(String(value));
  }

  /**
   * Execute kebabcase transformer
   * Converts string to kebab-case format
   */
  private executeKebabcase(value: unknown): string {
    return kebabCase(String(value));
  }

  /**
   * Execute constantcase transformer
   * Converts string to CONSTANT_CASE format
   */
  private executeConstantcase(value: unknown): string {
    return constantCase(String(value));
  }

  /**
   * Execute alphanumeric transformer
   * Removes all non-alphanumeric characters
   */
  private executeAlphanumeric(value: unknown): string {
    return String(value).replace(/[^a-zA-Z0-9]/gu, '');
  }

  /**
   * Execute collapse-spaces transformer
   * Collapses multiple consecutive spaces into single spaces
   */
  private executeCollapseSpaces(value: unknown): string {
    return String(value).replace(/\s+/gu, ' ');
  }

  /**
   * Execute remove-spaces transformer
   * Removes all spaces from the string
   */
  private executeRemoveSpaces(value: unknown): string {
    return String(value).replace(/\s/gu, '');
  }

  /**
   * Execute urlencode transformer
   * URL-encodes the string
   */
  private executeUrlencode(value: unknown): string {
    return encodeURIComponent(String(value));
  }

  /**
   * Execute dasherize transformer
   * Converts underscores to dashes
   */
  private executeDasherize(value: unknown): string {
    return kebabCase(String(value));
  }

  /**
   * Execute underscore transformer
   * Converts dashes to underscores
   */
  private executeUnderscore(value: unknown): string {
    return snakeCase(String(value));
  }

  private executeCapitalCase(value: unknown): string {
    return capitalCase(String(value));
  }

  /**
   * Execute adaCase transformer
   * Converts string to Ada_Case format
   */
  private executeAdaCase(value: unknown): string {
    return adaCase(String(value));
  }

  /**
   * Execute cobolCase transformer
   * Converts string to COBOL-CASE format
   */
  private executeCobolCase(value: unknown): string {
    return cobolCase(String(value));
  }

  /**
   * Execute dotNotation transformer
   * Converts string to dot.notation format
   */
  private executeDotNotation(value: unknown): string {
    return dotNotation(String(value));
  }

  /**
   * Execute pathCase transformer
   * Converts string to path/case format
   */
  private executePathCase(value: unknown): string {
    return pathCase(String(value));
  }

  /**
   * Execute spaceCase transformer
   * Converts string to space case format
   */
  private executeSpaceCase(value: unknown): string {
    return spaceCase(String(value));
  }

  /**
   * Execute trainCase transformer
   * Converts string to Train-Case format
   */
  private executeTrainCase(value: unknown): string {
    return trainCase(String(value));
  }

  /**
   * Execute upperCamelCase transformer
   * Converts string to UpperCamelCase format (same as PascalCase)
   */
  private executeUpperCamelCase(value: unknown): string {
    return upperCamelCase(String(value));
  }

  /**
   * Clear all registered transformers
   */
  clear(): void {
    this.transformers.clear();
  }

  /**
   * Get all registered transformer IDs
   */
  getIds(): string[] {
    return Array.from(this.transformers.keys());
  }
}

/**
 * Global transformer manager instance
 */
export const transformerManager = new TransformerManager();
