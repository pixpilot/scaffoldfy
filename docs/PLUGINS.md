---
layout: default
title: Plugin System - Scaffoldfy
---

# Plugin System

The plugin system allows you to extend `scaffoldfy` with custom task types, enabling specialized operations beyond the built-in task types.

## Overview

With the plugin system, you can:

- **Create custom task types** for domain-specific operations
- **Register plugins** to handle those task types
- **Implement lifecycle hooks** for global operations
- **Generate diff previews** for dry-run mode
- **Validate task configurations** before execution

## Quick Start

### Creating a Simple Plugin

```typescript
import { createPlugin, registerPlugin } from '@pixpilot/scaffoldfy';

const myPlugin = createPlugin(
  'my-plugin',
  'custom-greeting',
  async (task, config, options) => {
    if (options.dryRun) return;

    const greeting = task.config as { message: string };
    console.log(`${greeting.message}, ${config.author}!`);
  },
);

registerPlugin(myPlugin);
```

### Using Your Custom Task Type

```json
{
  "tasks": [
    {
      "id": "greet",
      "name": "Greet User",
      "description": "Display a greeting message",
      "required": false,
      "enabled": true,
      "type": "custom-greeting",
      "config": {
        "message": "Hello"
      }
    }
  ]
}
```

## Advanced Plugin Features

### Plugin with All Features

```typescript
import type { TaskDefinition } from '@pixpilot/scaffoldfy';
import { createPlugin, registerPlugin } from '@pixpilot/scaffoldfy';

const advancedPlugin = createPlugin(
  'advanced-plugin',
  'database-setup',
  // Execute function
  async (task, config, options) => {
    if (options.dryRun) return;

    const dbConfig = task.config as {
      type: string;
      name: string;
    };

    // Your database setup logic here
    console.log(`Setting up ${dbConfig.type} database: ${dbConfig.name}`);
  },
  {
    version: '1.0.0',

    // Generate diff for dry-run
    getDiff: async (task, config) => {
      const dbConfig = task.config as { type: string; name: string };
      return `Would create ${dbConfig.type} database: ${dbConfig.name}`;
    },

    // Validate task configuration
    validate: (task) => {
      const errors: string[] = [];
      const dbConfig = task.config as { type?: string; name?: string };

      if (!dbConfig.type) {
        errors.push('Database type is required');
      }

      if (!dbConfig.name) {
        errors.push('Database name is required');
      }

      if (dbConfig.type && !['postgres', 'mysql', 'sqlite'].includes(dbConfig.type)) {
        errors.push(`Unsupported database type: ${dbConfig.type}`);
      }

      return errors;
    },
  },
);

registerPlugin(advancedPlugin);
```

## Manual Plugin Creation

For more control, create the plugin object directly:

```typescript
import type { TaskPlugin } from '@pixpilot/scaffoldfy';
import { registerPlugin } from '@pixpilot/scaffoldfy';

const customPlugin: TaskPlugin = {
  name: 'custom-plugin',
  version: '1.0.0',
  taskTypes: ['custom-task-1', 'custom-task-2'], // Handle multiple types

  execute: async (task, config, options) => {
    // Implementation here
  },

  getDiff: async (task, config) =>
    // Return diff preview
    'Diff output',
  validate: (task) =>
    // Validation logic
    [], // Return array of error strings
};

registerPlugin(customPlugin);
```

## Lifecycle Hooks

Register global hooks that run during initialization:

```typescript
import { registerHooks } from '@pixpilot/scaffoldfy';

registerHooks({
  // Called before any tasks run
  beforeAll: async (config) => {
    console.log(`Starting initialization for ${config.projectName}`);
  },

  // Called after all tasks complete
  afterAll: async (config) => {
    console.log('All tasks completed successfully!');
  },

  // Called before each task
  beforeTask: async (task, config) => {
    console.log(`About to run: ${task.name}`);
  },

  // Called after each task
  afterTask: async (task, config) => {
    console.log(`Completed: ${task.name}`);
  },

  // Called when a task fails
  onError: async (error, task) => {
    console.error(`Task ${task?.name || 'unknown'} failed:`, error.message);
  },
});
```

## Plugin Management API

### Register a Plugin

```typescript
import { registerPlugin } from '@pixpilot/scaffoldfy';

registerPlugin(myPlugin);
```

### Unregister a Plugin

```typescript
import { unregisterPlugin } from '@pixpilot/scaffoldfy';

unregisterPlugin('plugin-name');
```

### Check if Task Type is Handled

```typescript
import { isPluginTaskType } from '@pixpilot/scaffoldfy';

if (isPluginTaskType('custom-task')) {
  console.log('This task type is handled by a plugin');
}
```

### Get Plugin by Name or Task Type

```typescript
import { getPlugin, getPluginForTaskType } from '@pixpilot/scaffoldfy';

const plugin = getPlugin('my-plugin');
const pluginForTask = getPluginForTaskType('custom-task');
```

### List All Plugins

```typescript
import { listPlugins } from '@pixpilot/scaffoldfy';

const plugins = listPlugins();
console.log('Registered plugins:', plugins);
```

## Real-World Examples

### Docker Setup Plugin

```typescript
import fs from 'node:fs';
import { createPlugin, registerPlugin } from '@pixpilot/scaffoldfy';

const dockerPlugin = createPlugin(
  'docker-plugin',
  'docker-setup',
  async (task, config, options) => {
    if (options.dryRun) return;

    const dockerConfig = task.config as {
      baseImage: string;
      port: number;
    };

    const dockerfile = `
FROM ${dockerConfig.baseImage}
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE ${dockerConfig.port}
CMD ["npm", "start"]
`;

    fs.writeFileSync('Dockerfile', dockerfile.trim());

    const dockerCompose = `
version: '3.8'
services:
  app:
    build: .
    ports:
      - "${dockerConfig.port}:${dockerConfig.port}"
`;

    fs.writeFileSync('docker-compose.yml', dockerCompose.trim());
  },
  {
    getDiff: async (task, config) => {
      const dockerConfig = task.config as { baseImage: string; port: number };
      return `Would create Dockerfile and docker-compose.yml\n  Base image: ${dockerConfig.baseImage}\n  Port: ${dockerConfig.port}`;
    },
    validate: (task) => {
      const errors: string[] = [];
      const dockerConfig = task.config as { baseImage?: string; port?: number };

      if (!dockerConfig.baseImage) {
        errors.push('baseImage is required');
      }

      if (!dockerConfig.port) {
        errors.push('port is required');
      } else if (dockerConfig.port < 1 || dockerConfig.port > 65535) {
        errors.push('port must be between 1 and 65535');
      }

      return errors;
    },
  },
);

registerPlugin(dockerPlugin);
```

Usage:

```json
{
  "tasks": [
    {
      "id": "setup-docker",
      "name": "Setup Docker",
      "description": "Create Dockerfile and docker-compose.yml",
      "required": true,
      "enabled": true,
      "type": "docker-setup",
      "config": {
        "baseImage": "node:18-alpine",
        "port": 3000
      }
    }
  ]
}
```

### Environment Variables Plugin

```typescript
import fs from 'node:fs';
import { createPlugin, registerPlugin } from '@pixpilot/scaffoldfy';

const envPlugin = createPlugin(
  'env-plugin',
  'create-env',
  async (task, config, options) => {
    if (options.dryRun) return;

    const envConfig = task.config as {
      file: string;
      variables: Record<string, string>;
    };

    const envContent = Object.entries(envConfig.variables)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    fs.writeFileSync(envConfig.file, `${envContent}\n`);
  },
  {
    getDiff: async (task, config) => {
      const envConfig = task.config as {
        file: string;
        variables: Record<string, string>;
      };

      const lines = Object.entries(envConfig.variables).map(
        ([key, value]) => `+ ${key}=${value}`,
      );

      return `File: ${envConfig.file}\n${lines.join('\n')}`;
    },
  },
);

registerPlugin(envPlugin);
```

## Testing Plugins

```typescript
import { clearPlugins, executePluginTask, registerPlugin } from '@pixpilot/scaffoldfy';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('my plugin', () => {
  beforeEach(() => {
    clearPlugins();
    registerPlugin(myPlugin);
  });

  afterEach(() => {
    clearPlugins();
  });

  it('should execute custom task', async () => {
    const task = {
      id: 'test',
      name: 'Test',
      description: 'Test task',
      required: true,
      enabled: true,
      type: 'custom-task',
      config: { test: true },
    };

    const config = {
      projectName: 'test',
      owner: 'owner',
      repoUrl: 'url',
      author: 'author',
      repoUrl: 'base',
      orgName: 'org',
    };

    await expect(
      executePluginTask(task, config, { dryRun: false }),
    ).resolves.not.toThrow();
  });
});
```

## Best Practices

1. **Validate configuration** - Always implement the `validate` function
2. **Support dry-run** - Implement `getDiff` for preview functionality
3. **Handle errors gracefully** - Catch and provide meaningful error messages
4. **Version your plugins** - Include version information for compatibility
5. **Document your plugins** - Provide clear usage examples
6. **Test thoroughly** - Write comprehensive tests for your plugins
7. **Use TypeScript** - Type your config interfaces for better DX
8. **Keep plugins focused** - One plugin should handle one type of operation
9. **Don't assume files exist** - Check before reading/modifying files
10. **Respect dry-run mode** - Never modify files when `options.dryRun` is true

## API Reference

### Types

```typescript
interface TaskPlugin {
  name: string;
  version?: string;
  taskTypes: string[];
  execute: (
    task: TaskDefinition,
    config: InitConfig,
    options: { dryRun: boolean },
  ) => Promise<void>;
  getDiff?: (task: TaskDefinition, config: InitConfig) => Promise<string>;
  validate?: (task: TaskDefinition) => string[];
}

interface PluginHooks {
  beforeAll?: (config: InitConfig) => Promise<void>;
  afterAll?: (config: InitConfig) => Promise<void>;
  beforeTask?: (task: TaskDefinition, config: InitConfig) => Promise<void>;
  afterTask?: (task: TaskDefinition, config: InitConfig) => Promise<void>;
  onError?: (error: Error, task?: TaskDefinition) => Promise<void>;
}
```

### Functions

- `registerPlugin(plugin: TaskPlugin): void` - Register a plugin
- `unregisterPlugin(name: string): void` - Unregister a plugin
- `getPlugin(name: string): TaskPlugin | undefined` - Get plugin by name
- `getPluginForTaskType(taskType: string): TaskPlugin | undefined` - Get plugin for task type
- `isPluginTaskType(taskType: string): boolean` - Check if task type is handled by a plugin
- `listPlugins(): string[]` - List all registered plugin names
- `clearPlugins(): void` - Clear all registered plugins
- `registerHooks(hooks: Partial<PluginHooks>): void` - Register lifecycle hooks
- `createPlugin(name, taskType, execute, options?): TaskPlugin` - Create a plugin
- `executePluginTask(task, config, options): Promise<void>` - Execute a plugin task
- `getPluginTaskDiff(task, config): Promise<string | undefined>` - Get diff for plugin task
- `validatePluginTask(task): string[]` - Validate plugin task configuration

## Distribution

To share your plugin:

1. **Create an npm package**:

```json
{
  "name": "@myorg/scaffoldfy-docker-plugin",
  "version": "1.0.0",
  "main": "dist/index.js",
  "peerDependencies": {
    "@pixpilot/scaffoldfy": "^1.0.0"
  }
}
```

2. **Export your plugin**:

```typescript
export { dockerPlugin } from './docker-plugin.js';
```

3. **Users import and register**:

```typescript
import { dockerPlugin } from '@myorg/scaffoldfy-docker-plugin';
import { registerPlugin, runWithTasks } from '@pixpilot/scaffoldfy';

registerPlugin(dockerPlugin);
await runWithTasks(tasks);
```

## Plugin Ideas

- Database setup (PostgreSQL, MongoDB, Redis)
- Cloud configuration (AWS, Azure, GCP)
- CI/CD setup (GitHub Actions, GitLab CI, CircleCI)
- Linter/formatter configuration (ESLint, Prettier, Biome)
- Testing framework setup (Jest, Vitest, Playwright)
- Documentation generators (TypeDoc, JSDoc)
- Monorepo tools (Turborepo, Nx, Lerna)
- Package manager configuration (pnpm, yarn, npm)
