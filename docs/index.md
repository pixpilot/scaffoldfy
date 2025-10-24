---
layout: default
title: Scaffoldfy Documentation - Home
---

# Scaffoldfy Documentation

Welcome to the official documentation for **@pixpilot/scaffoldfy** (formerly scaffoldfy) - a flexible and powerful template initialization utility for automating project setup, cleanup, and configuration tasks.

---

## 🚀 Quick Start

**New to Scaffoldfy?** Start here:

1. **[Quick Reference](QUICK_REFERENCE.html)** - Essential commands and examples to get started in minutes
2. **[Getting Started Guide](GETTING_STARTED.html)** - Detailed installation and setup instructions
3. **[Task Types Reference](TASK_TYPES.html)** - Learn about all 9 available task types

---

## 📚 Documentation Sections

### Getting Started

<div style="padding: 15px; background: #f6f8fa; border-radius: 6px; margin: 15px 0;">
  <strong><a href="QUICK_REFERENCE.html">📋 Quick Reference</a></strong><br>
  <em>Fast-track guide with essential commands, examples, and common patterns</em>
</div>

<div style="padding: 15px; background: #f6f8fa; border-radius: 6px; margin: 15px 0;">
  <strong><a href="GETTING_STARTED.html">🎯 Getting Started</a></strong><br>
  <em>Installation, CLI usage, and programmatic API examples</em>
</div>

### Core Concepts

<div style="padding: 15px; background: #f6f8fa; border-radius: 6px; margin: 15px 0;">
  <strong><a href="TASK_TYPES.html">🔧 Task Types Reference</a></strong><br>
  <em>Complete reference for all 9 built-in task types: write, update-json, copy, delete, exec, and more</em>
</div>

<div style="padding: 15px; background: #f6f8fa; border-radius: 6px; margin: 15px 0;">
  <strong><a href="PROMPTS.html">💬 Interactive Prompts</a></strong><br>
  <em>Collect user input with various prompt types (text, select, confirm, multiselect, password)</em>
</div>

<div style="padding: 15px; background: #f6f8fa; border-radius: 6px; margin: 15px 0;">
  <strong><a href="VARIABLES.html">📦 Variables</a></strong><br>
  <em>Define reusable values without user interaction - great for computed values</em>
</div>

<div style="padding: 15px; background: #f6f8fa; border-radius: 6px; margin: 15px 0;">
  <strong><a href="PROMPTS_QUICK_REFERENCE.html">⚡ Prompts Cheat Sheet</a></strong><br>
  <em>Quick syntax reference for all prompt types</em>
</div>

### Advanced Features

<div style="padding: 15px; background: #f6f8fa; border-radius: 6px; margin: 15px 0;">
  <strong><a href="FEATURES.html">🎨 Advanced Features</a></strong><br>
  <em>Conditional execution, variables, and Handlebars templates</em>
</div>

<div style="padding: 15px; background: #f6f8fa; border-radius: 6px; margin: 15px 0;">
  <strong><a href="TEMPLATE_INHERITANCE.html">🧬 Template Inheritance</a></strong><br>
  <em>Extend and compose templates for code reuse and better organization</em>
</div>

<div style="padding: 15px; background: #f6f8fa; border-radius: 6px; margin: 15px 0;">
  <strong><a href="HANDLEBARS_TEMPLATES.html">🎯 Handlebars Templates</a></strong><br>
  <em>Advanced templating with conditionals, loops, and custom helpers</em>
</div>

<div style="padding: 15px; background: #f6f8fa; border-radius: 6px; margin: 15px 0;">
  <strong><a href="PLUGINS.html">🔌 Plugin System</a></strong><br>
  <em>Create custom task types and lifecycle hooks to extend functionality</em>
</div>

<div style="padding: 15px; background: #f6f8fa; border-radius: 6px; margin: 15px 0;">
  <strong><a href="DRY_RUN.html">🔍 Dry Run Mode</a></strong><br>
  <em>Preview changes with detailed diffs before applying them</em>
</div>

### References

<div style="padding: 15px; background: #f6f8fa; border-radius: 6px; margin: 15px 0;">
  <strong><a href="EXECUTABLE_DEFAULTS_REFERENCE.html">⚙️ Executable Defaults</a></strong><br>
  <em>Default values and configuration for executable tasks</em>
</div>

---

## 💡 Features at a Glance

✅ **9 Task Types** - `update-json`, `write`, `regex-replace`, `replace-in-file`, `delete`, `conditional-delete`, `rename`, `git-init`, `exec`

✅ **Template Inheritance** - Extend base templates for code reuse

✅ **Dry-Run Mode with Diff** - Preview exact changes before applying

✅ **Plugin System** - Create custom task types and lifecycle hooks

✅ **Interactive Prompts** - Collect user input with 5 prompt types

✅ **JSON/TypeScript Config** - Define tasks in JSON or TypeScript files

✅ **Task Dependencies** - Ensure tasks run in the correct order

✅ **Type-Safe** - Full TypeScript support with JSON schema validation

✅ **Template Variables** - Use `{{variable}}` syntax for dynamic configuration

✅ **Handlebars Support** - Advanced templating with conditionals, loops, and helpers

✅ **CLI & Programmatic** - Use as a command-line tool or import as a library

---

## 🎯 Common Use Cases

**Setting up a new project?**
→ [Getting Started Guide](GETTING_STARTED.html) + [Task Types Reference](TASK_TYPES.html)

**Need user input?**
→ [Interactive Prompts](PROMPTS.html) + [Prompts Cheat Sheet](PROMPTS_QUICK_REFERENCE.html)

**Need dynamic values without user input?**
→ [Variables](VARIABLES.html)

**Building complex templates?**
→ [Template Inheritance](TEMPLATE_INHERITANCE.html) + [Handlebars Templates](HANDLEBARS_TEMPLATES.html)

**Want to preview changes first?**
→ [Dry Run Mode](DRY_RUN.html)

**Extending with custom functionality?**
→ [Plugin System](PLUGINS.html)

**Using conditional logic?**
→ [Advanced Features Guide](FEATURES.html)

---

## 🚀 Installation

```bash
# Install globally for CLI usage
npm install -g @pixpilot/scaffoldfy

# Or install locally in your project
npm install --save-dev @pixpilot/scaffoldfy
```

---

## ⚡ Quick Example

```json
{
  "$schema": "../schema/tasks.schema.json",
  "prompts": [
    {
      "id": "projectName",
      "type": "input",
      "message": "Project name",
      "required": true
    }
  ],
  "tasks": [
    {
      "id": "create-readme",
      "name": "Create README",
      "type": "write",
      "config": {
        "file": "README.md",
        "template": "# {{projectName}}\n\nA new project."
      }
    },
    {
      "id": "init-git",
      "name": "Initialize Git",
      "type": "git-init"
    }
  ]
}
```

Run it:

```bash
scaffoldfy init template.json --dry-run
```

---

## 🤝 Contributing

Found an issue or want to improve the docs? Contributions are welcome!

- [Main Repository](https://github.com/pixpilot/scaffoldfy)
- [Report Issues](https://github.com/pixpilot/scaffoldfy/issues)
- [NPM Package](https://www.npmjs.com/package/@pixpilot/scaffoldfy)

---

## 📄 License

MIT License - see the [LICENSE](https://github.com/pixpilot/scaffoldfy/blob/main/LICENSE) file for details.
