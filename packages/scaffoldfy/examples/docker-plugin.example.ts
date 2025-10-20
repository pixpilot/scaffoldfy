/**
 * Example: Docker Plugin for scaffoldfy
 *
 * This example shows how to create a custom plugin that generates
 * Docker configuration files.
 *
 * Usage:
 * 1. Import and register the plugin
 * 2. Use the 'docker-setup' task type in your template
 */

import { createPlugin, registerPlugin } from 'scaffoldfy';
import fs from 'node:fs';
import type { InitConfig, TaskDefinition } from 'scaffoldfy';

interface DockerConfig {
  baseImage: string;
  port: number;
  workdir?: string;
  installCommand?: string;
  startCommand?: string;
}

// Create the Docker plugin
const dockerPlugin = createPlugin(
  'docker-plugin',
  'docker-setup',
  // Execute function
  async (task: TaskDefinition, config: InitConfig, options: { dryRun: boolean }) => {
    if (options.dryRun) return;

    const dockerConfig = task.config as DockerConfig;

    // Generate Dockerfile
    const dockerfile = `
FROM ${dockerConfig.baseImage}
WORKDIR ${dockerConfig.workdir ?? '/app'}
COPY package*.json ./
RUN ${dockerConfig.installCommand ?? 'npm install'}
COPY . .
EXPOSE ${dockerConfig.port}
CMD ${dockerConfig.startCommand ?? '["npm", "start"]'}
    `.trim();

    fs.writeFileSync('Dockerfile', dockerfile);
    console.log('✓ Created Dockerfile');

    // Generate docker-compose.yml
    const dockerCompose = `
version: '3.8'
services:
  app:
    build: .
    ports:
      - "${dockerConfig.port}:${dockerConfig.port}"
    environment:
      - NODE_ENV=production
    volumes:
      - .:/app
      - /app/node_modules
    `.trim();

    fs.writeFileSync('docker-compose.yml', dockerCompose);
    console.log('✓ Created docker-compose.yml');

    // Generate .dockerignore
    const dockerignore = `
node_modules
npm-debug.log
.git
.gitignore
.env
.env.local
dist
*.md
    `.trim();

    fs.writeFileSync('.dockerignore', dockerignore);
    console.log('✓ Created .dockerignore');
  },
  {
    version: '1.0.0',

    // Generate diff for dry-run mode
    getDiff: async (task: TaskDefinition, config: InitConfig) => {
      const dockerConfig = task.config as DockerConfig;

      return `
Would create the following files:
  + Dockerfile
  + docker-compose.yml
  + .dockerignore

Configuration:
  Base Image: ${dockerConfig.baseImage}
  Port: ${dockerConfig.port}
  Working Directory: ${dockerConfig.workdir ?? '/app'}
  Install Command: ${dockerConfig.installCommand ?? 'npm install'}
  Start Command: ${dockerConfig.startCommand ?? '["npm", "start"]'}
      `.trim();
    },

    // Validate task configuration
    validate: (task: TaskDefinition) => {
      const errors: string[] = [];
      const dockerConfig = task.config as Partial<DockerConfig>;

      if (!dockerConfig.baseImage) {
        errors.push('baseImage is required');
      }

      if (!dockerConfig.port) {
        errors.push('port is required');
      } else if (typeof dockerConfig.port !== 'number') {
        errors.push('port must be a number');
      } else if (dockerConfig.port < 1 || dockerConfig.port > 65535) {
        errors.push('port must be between 1 and 65535');
      }

      return errors;
    },
  },
);

// Register the plugin
registerPlugin(dockerPlugin);

console.log('✓ Docker plugin registered');

export { dockerPlugin };
