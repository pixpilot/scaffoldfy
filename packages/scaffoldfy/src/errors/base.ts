/**
 * Base error classes for Scaffoldfy
 */

/**
 * Base error class for Scaffoldfy-specific errors
 */
export class ScaffoldfyError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Error thrown when a circular dependency is detected in template inheritance
 */
export class CircularDependencyError extends ScaffoldfyError {
  constructor(
    message: string,
    public readonly dependencyChain: string[],
    public readonly resolvedPath?: string,
  ) {
    super(message, 'CIRCULAR_DEPENDENCY');
    this.name = 'CircularDependencyError';
  }

  /**
   * Create a circular dependency error for configuration inheritance
   */
  static forConfigurationInheritance(
    visitedPaths: Set<string>,
    resolvedPath: string,
  ): CircularDependencyError {
    const dependencyChain = Array.from(visitedPaths);
    const message = `Circular dependency detected: ${dependencyChain.join(
      ' -> ',
    )} -> ${resolvedPath}`;

    return new CircularDependencyError(message, dependencyChain, resolvedPath);
  }

  /**
   * Create a circular dependency error for task dependencies
   */
  static forTaskDependency(taskId: string): CircularDependencyError {
    const message = `Circular dependency detected involving task: ${taskId}`;
    return new CircularDependencyError(message, [taskId]);
  }

  /**
   * Create a circular dependency error for template dependencies
   */
  static forConfigDependencies(
    visitingChain: string[],
    templateName: string,
  ): CircularDependencyError {
    const dependencyChain = [...visitingChain, templateName];
    const message = `Circular dependency detected in template dependencies: ${dependencyChain.join(
      ' -> ',
    )}`;
    return new CircularDependencyError(message, dependencyChain);
  }
}
