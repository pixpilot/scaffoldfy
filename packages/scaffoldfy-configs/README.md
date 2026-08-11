# @pixpilot/scaffoldfy-configs

A collection of reusable scaffoldfy templates for generating common project configuration files and setups.

## Installation

```sh
npm install @pixpilot/scaffoldfy @pixpilot/scaffoldfy-configs
```

## Available Templates

This package provides the following scaffoldfy templates:

<!-- scaffoldfy-templates:start -->

### license-file

Generate a LICENSE file with common open-source licenses

Usage:

```sh
npx @pixpilot/scaffoldfy --config https://unpkg.com/@pixpilot/scaffoldfy-configs/license-file/scaffoldfy.json
```

### monorepo-generate-packages-section

Generates packages section in monorepo README by reading package.json files

Usage:

```sh
npx @pixpilot/scaffoldfy --config https://unpkg.com/@pixpilot/scaffoldfy-configs/monorepo-generate-packages-section/scaffoldfy.json
```

### pixpilot-changesets-release

Pixpilot workspace package generator template for pnpm + Turbo monorepo. Provides project info prompts and config tasks.

Usage:

```sh
npx @pixpilot/scaffoldfy --config https://unpkg.com/@pixpilot/scaffoldfy-configs/pixpilot-changesets-release/scaffoldfy.json
```

### pixpilot-copilot-instructions

GitHub Copilot instructions template for Pixpilot projects

Usage:

```sh
npx @pixpilot/scaffoldfy --config https://unpkg.com/@pixpilot/scaffoldfy-configs/pixpilot-copilot-instructions/scaffoldfy.json
```

### pixpilot-info

Project information prompts for pnpm-turbo-monorepo-template

Usage:

```sh
npx @pixpilot/scaffoldfy --config https://unpkg.com/@pixpilot/scaffoldfy-configs/pixpilot-info/scaffoldfy.json
```

### project-info

Project information prompts for pnpm-turbo-monorepo-template

Usage:

```sh
npx @pixpilot/scaffoldfy --config https://unpkg.com/@pixpilot/scaffoldfy-configs/project-info/scaffoldfy.json
```

### security-policy

Security policy template with configurable contact email

Usage:

```sh
npx @pixpilot/scaffoldfy --config https://unpkg.com/@pixpilot/scaffoldfy-configs/security-policy/scaffoldfy.json
```

### turbo-workspace-package-generator

Pixpilot workspace package generator template for pnpm + Turbo monorepo. Provides project info prompts and config tasks.

Usage:

```sh
npx @pixpilot/scaffoldfy --config https://unpkg.com/@pixpilot/scaffoldfy-configs/turbo-workspace-package-generator/scaffoldfy.json
```

### update-root-package-json

Update root package.json with repository information

Usage:

```sh
npx @pixpilot/scaffoldfy --config https://unpkg.com/@pixpilot/scaffoldfy-configs/update-root-package-json/scaffoldfy.json
```

### workspace-generator

Initial setup for a pnpm + Turbo monorepo template, including project info, license, and initial package generation.

Usage:

```sh
npx @pixpilot/scaffoldfy --config https://unpkg.com/@pixpilot/scaffoldfy-configs/workspace-generator/scaffoldfy.json
```

### workspace-initializer

Initial setup for a pnpm + Turbo monorepo template, including project info, license, and initial package generation.

Usage:

```sh
npx @pixpilot/scaffoldfy --config https://unpkg.com/@pixpilot/scaffoldfy-configs/workspace-initializer/scaffoldfy.json
```

### workspace-package-generator

Generate a new package for a pnpm + Turbo monorepo workspace

Usage:

```sh
npx @pixpilot/scaffoldfy --config https://unpkg.com/@pixpilot/scaffoldfy-configs/workspace-package-generator/scaffoldfy.json
```

### workspace-package-generator/experiment

Generate a new package for a pnpm + Turbo monorepo workspace

Usage:

```sh
npx @pixpilot/scaffoldfy --config https://unpkg.com/@pixpilot/scaffoldfy-configs/workspace-package-generator/experiment/scaffoldfy.json
```

<!-- scaffoldfy-templates:end -->

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
