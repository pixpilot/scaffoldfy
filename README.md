# @pixpilot/scaffoldfy

A flexible and powerful task automation utility for project setup, cleanup, and configuration tasks.

## ✨ Features

- 🔄 **9 Task Types** - update-json, template, regex-replace, replace-in-file, delete, conditional-delete, rename, git-init, exec
- 💬 **Interactive Prompts** - Collect user input with various prompt types
- 🧩 **Template Inheritance** - Extend base templates for code reuse
- 🔍 **Dry-Run Mode** - Preview changes with detailed diffs before applying
- 🔌 **Plugin System** - Create custom task types and lifecycle hooks
- 📝 **Handlebars Support** - Advanced templating with conditionals, loops, and helpers
- ✅ **Type-Safe** - Full TypeScript support with JSON schema validation

## 🚀 Quick Start

### Installation

```sh
pnpm add @pixpilot/scaffoldfy
```

### Usage

```sh
# Basic usage with default task file
scaffoldfy

# With custom tasks file
scaffoldfy --tasks-file ./my-tasks.json

# Preview changes (dry run)
scaffoldfy --dry-run
```

## 📚 Documentation

- **[Complete Documentation](https://pixpilot.github.io/scaffoldfy/)** - Full guides and references
- **[Getting Started](https://pixpilot.github.io/scaffoldfy/GETTING_STARTED.html)** - Installation and examples
- **[Package README](packages/scaffoldfy/README.md)** - Package-specific documentation

## 📦 Monorepo Structure

This is a TypeScript monorepo managed with pnpm and Turbo:

```
scaffoldfy/
├── packages/
│   └── scaffoldfy/        # Main package
├── docs/                  # Documentation
├── tooling/               # Shared configs (ESLint, TypeScript, etc.)
└── turbo/                 # Turbo generators
```

### Development

```sh
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

## 🚢 Releases

### 🤖 Automated Release (Recommended)

This monorepo uses the [Changeset Autopilot GitHub Action](https://github.com/pixpilot/changesets-autopilot) for fully automated, dependency-aware versioning and publishing. It:

- Detects conventional commits and generates changesets automatically
- Handles branch-based release channels (main, next, beta, etc.)
- Versions and publishes only changed packages to npm
- Manages pre-releases and dist-tags
- Runs entirely in CI for maximum reliability

**How it works:**

- On every push to a release branch, the action analyzes commits, generates changesets, versions packages, and publishes to npm.
- No manual steps are needed—just follow the conventional commit format and push to the correct branch.
- See the [Changeset Autopilot documentation](https://github.com/pixpilot/changesets-autopilot) for setup and configuration details.

### 📝 Manual Release

Manual releases are possible if needed (for example, for hotfixes or if CI is unavailable):

1. Ensure you have an `NPM_TOKEN` with publish rights set in your environment (for CI/CD, set as a secret).
2. Run the following commands from the root:
   ```sh
   pnpm changeset
   pnpm changeset version
   pnpm changeset publish
   ```
   This will version and publish only those workspace packages with relevant changes.

- Each package is versioned independently.
- Git tags are created in the format `<package-name>-<version>`.
- See `.changeset/config.json` for configuration details.

For more, see the [Changesets documentation](https://github.com/changesets/changesets).

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

[MIT](LICENSE)
