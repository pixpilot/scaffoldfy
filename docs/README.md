# Scaffoldfy Documentation

Welcome to the official documentation for **@pixpilot/scaffoldfy** (formerly scaffoldfy) - a flexible and powerful template initialization utility for automating project setup, cleanup, and configuration tasks.

## 📚 Table of Contents

### Getting Started

- **[Getting Started Guide](GETTING_STARTED.md)** - Installation, CLI usage, and programmatic API examples

### Core Concepts

- **[Task Types Reference](TASK_TYPES.md)** - Complete reference for all 9 built-in task types
- **[Interactive Prompts](PROMPTS.md)** - Collect user input with various prompt types
- **[Variables](VARIABLES.md)** - Define reusable values without user interaction
- **[Prompts Quick Reference](PROMPTS_QUICK_REFERENCE.md)** - Quick syntax reference for prompts

### Advanced Features

- **[Advanced Features Guide](FEATURES.md)** - Conditional execution, global prompts, and Handlebars templates
- **[Template Inheritance](TEMPLATE_INHERITANCE.md)** - Extend and compose templates for code reuse
- **[Handlebars Templates](HANDLEBARS_TEMPLATES.md)** - Advanced templating with conditionals, loops, and helpers
- **[Plugin System](PLUGINS.md)** - Create custom task types and lifecycle hooks
- **[Dry Run Mode](DRY_RUN.md)** - Preview changes with detailed diffs before applying

### References

- **[Executable Defaults Reference](EXECUTABLE_DEFAULTS_REFERENCE.md)** - Default values for executable tasks

## 🚀 Quick Links

### Essential Reading

1. [Getting Started](GETTING_STARTED.md) - Start here if you're new
2. [Task Types Reference](TASK_TYPES.md) - Learn about available task types
3. [Interactive Prompts](PROMPTS.md) - Make your templates interactive

### Common Use Cases

**Setting up a new project?**
→ [Getting Started Guide](GETTING_STARTED.md) + [Task Types Reference](TASK_TYPES.md)

**Need user input?**
→ [Interactive Prompts](PROMPTS.md) + [Prompts Quick Reference](PROMPTS_QUICK_REFERENCE.md)

**Need dynamic values without user input?**
→ [Variables](VARIABLES.md)

**Building complex templates?**
→ [Template Inheritance](TEMPLATE_INHERITANCE.md) + [Handlebars Templates](HANDLEBARS_TEMPLATES.md)

**Want to preview changes first?**
→ [Dry Run Mode](DRY_RUN.md)

**Extending with custom functionality?**
→ [Plugin System](PLUGINS.md)

**Using conditional logic?**
→ [Advanced Features Guide](FEATURES.md)

## 💡 Features at a Glance

- 🔄 **9 Task Types** - update-json, write, regex-replace, replace-in-file, delete, conditional-delete, rename, git-init, exec
- 🧩 **Template Inheritance** - Extend base templates for code reuse
- 🔍 **Dry-Run Mode with Diff** - Preview exact changes before applying
- 🔌 **Plugin System** - Create custom task types and lifecycle hooks
- 💬 **Interactive Prompts** - Collect user input with 5 prompt types
- 📦 **JSON/TypeScript Config** - Define tasks in JSON or TypeScript files
- 🔗 **Task Dependencies** - Ensure tasks run in the correct order
- ✅ **Type-Safe** - Full TypeScript support with JSON schema validation
- 🎯 **Template Variables** - Use `{{variable}}` syntax for dynamic configuration
- 📝 **Handlebars Support** - Advanced templating with conditionals, loops, and helpers
- ⚡ **CLI & Programmatic** - Use as a command-line tool or import as a library

## 🤝 Contributing

Found an issue or want to improve the docs? Contributions are welcome!

- [Main Repository](https://github.com/pixpilot/scaffoldfy)
- [Report Issues](https://github.com/pixpilot/scaffoldfy/issues)

## 📄 License

MIT License - see the [LICENSE](../LICENSE) file for details.
