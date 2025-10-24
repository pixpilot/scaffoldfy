# @pixpilot/scaffoldfy-configs

A collection of reusable scaffoldfy templates for generating common project configuration files and setups.

## Installation

```sh
pnpm add @pixpilot/scaffoldfy @pixpilot/scaffoldfy-configs
```

## Available Templates

This package provides the following scaffoldfy templates:

### license-file

Generate a LICENSE file with common open-source licenses (MIT, Apache 2.0, GPL, BSD, etc.)

### project-info

Collect and manage project information prompts for consistent project setup

### turbo-workspace-package-generator

Generate packages for pnpm + Turbo monorepos with customizable bundler options

### pixpilot-changesets-release

Configure changesets for automated package publishing

### pixpilot-copilot-instructions

Generate GitHub Copilot instructions for your project

### pixpilot-info

Project information and metadata management

### security-policy

Generate security policy documentation

### monorepo-generate-packages-section

Configure package generation for monorepo setups

### update-root-package-json

Update root package.json with common configurations

## Usage

After installing both `@pixpilot/scaffoldfy` and `@pixpilot/scaffoldfy-configs`, you can use any of the templates by referencing them in your scaffoldfy configuration.

### Example: Using the license-file template

Create a `scaffoldfy.json` file in your project:

```json
{
  "$schema": "https://unpkg.com/@pixpilot/scaffoldfy/schema",
  "extends": ["@pixpilot/scaffoldfy-configs/license-file"]
}
```

Then run:

```sh
npx @pixpilot/scaffoldfy
```

### Combining multiple templates

```json
{
  "$schema": "https://unpkg.com/@pixpilot/scaffoldfy/schema",
  "extends": [
    "@pixpilot/scaffoldfy-configs/project-info",
    "@pixpilot/scaffoldfy-configs/license-file",
    "@pixpilot/scaffoldfy-configs/pixpilot-changesets-release"
  ]
}
```

## Contributing

This package contains scaffoldfy templates that can be used individually or combined. Each template is self-contained in its own directory with a `scaffoldfy.json` configuration file.

To add a new template:

1. Create a new directory under `packages/scaffoldfy-configs/`
2. Add a `scaffoldfy.json` file with your template configuration
3. Include any template files or assets your template needs

## License

MIT
