---
layout: default
title: Exec File Plugin - Scaffoldfy
---

# Exec File Plugin

The `exec-file` plugin allows you to execute local or remote script files with full support for variable interpolation in file paths, arguments, parameters, and working directories.

## Overview

Unlike the `exec` plugin which runs inline shell commands, `exec-file` executes external script files. This is useful for:

- Running setup/configuration scripts
- Executing remote scripts from URLs
- Running scripts with dynamic arguments based on user input
- Passing environment variables to scripts
- Supporting multiple runtimes (Node.js, Bash, PowerShell, etc.)

## Configuration

```typescript
interface ExecFileConfig {
  file: string; // Path to script (local or remote URL)
  runtime?: ExecFileRuntime; // 'node' | 'bash' | 'sh' | 'pwsh' | 'powershell' (auto-detected if omitted)
  args?: string[]; // Arguments to pass to the script
  parameters?: Record<string, string>; // Environment variables
  cwd?: string; // Working directory
  condition?: string; // Optional condition to execute
}
```

### Configuration Fields

- **`file`** (required): Path to the script file to execute
  - Local: `'scripts/setup.js'`, `'./scripts/setup.sh'`
  - Remote: `'https://example.com/scripts/setup.js'`
  - **Supports variable interpolation**: `'scripts/{{projectName}}-setup.js'`

- **`runtime`** (optional): Runtime environment to execute the file
  - If not specified, **auto-detected from file extension**:
    - `.js`, `.cjs`, `.mjs` → `node`
    - `.sh`, `.bash` → `bash`
    - `.ps1` → `pwsh`
  - Falls back to `node` if detection fails
  - Manual options: `'node'`, `'bash'`, `'sh'`, `'pwsh'`, `'powershell'`

- **`args`** (optional): Array of arguments to pass to the script
  - **Each argument supports variable interpolation**
  - Example: `['--name={{projectName}}', '--author={{author}}']`

- **`parameters`** (optional): Environment variables to pass to the script
  - **Values support variable interpolation**
  - Example: `{ "PROJECT_NAME": "{{projectName}}", "AUTHOR": "{{author}}" }`

- **`cwd`** (optional): Working directory for script execution
  - **Supports variable interpolation**
  - Default: `process.cwd()`

- **`condition`** (optional): JavaScript expression to conditionally execute the task
  - Example: `'runSetup === true'`

## Runtime Auto-Detection

The plugin automatically detects the appropriate runtime based on the file extension:

```json
{
  "type": "exec-file",
  "config": {
    "file": "scripts/setup.js"
    // Runtime automatically detected as 'node'
  }
}
```

**Detection Rules:**

- `.js`, `.cjs`, `.mjs` → `node`
- `.sh`, `.bash` → `bash`
- `.ps1` → `pwsh`
- Unknown extension → `node` (default)

## Variable Interpolation

**All string fields support `{{variable}}` interpolation:**

| Field        | Supports Interpolation | Example                              |
| ------------ | ---------------------- | ------------------------------------ |
| `file`       | ✅ Yes                 | `'scripts/{{projectName}}-setup.js'` |
| `args`       | ✅ Yes (each arg)      | `['--name={{projectName}}']`         |
| `parameters` | ✅ Yes (values)        | `{ "NAME": "{{projectName}}" }`      |
| `cwd`        | ✅ Yes                 | `'{{projectName}}-scripts'`          |

Variables are resolved from:

- Prompt responses
- Variable definitions
- Built-in config values (projectName, author, etc.)

## Examples

### Basic Node.js Script Execution

```json
{
  "id": "run-setup",
  "name": "Run Setup Script",
  "type": "exec-file",
  "config": {
    "file": "scripts/setup.js",
    "runtime": "node"
  }
}
```

### Script with Variable Interpolation

```json
{
  "id": "run-project-setup",
  "name": "Run Project-Specific Setup",
  "type": "exec-file",
  "config": {
    "file": "scripts/{{projectName}}-setup.js",
    "runtime": "node"
  }
}
```

### Script with Arguments

```json
{
  "id": "configure-project",
  "name": "Configure Project",
  "type": "exec-file",
  "config": {
    "file": "scripts/configure.js",
    "runtime": "node",
    "args": ["--name={{projectName}}", "--author={{author}}", "--license={{license}}"]
  }
}
```

### Script with Environment Variables

```json
{
  "id": "build-project",
  "name": "Build Project",
  "type": "exec-file",
  "config": {
    "file": "scripts/build.js",
    "runtime": "node",
    "parameters": {
      "PROJECT_NAME": "{{projectName}}",
      "BUILD_ENV": "{{environment}}",
      "AUTHOR": "{{author}}"
    }
  }
}
```

### Script with Custom Working Directory

```json
{
  "id": "run-in-subdir",
  "name": "Run Script in Subdirectory",
  "type": "exec-file",
  "config": {
    "file": "scripts/build.js",
    "runtime": "node",
    "cwd": "packages/{{packageName}}"
  }
}
```

### Remote Script Execution

Execute a script from a remote URL:

```json
{
  "id": "run-remote-setup",
  "name": "Run Remote Setup Script",
  "type": "exec-file",
  "config": {
    "file": "https://raw.githubusercontent.com/your-org/scripts/main/setup.js",
    "runtime": "node",
    "args": ["--project={{projectName}}"]
  }
}
```

**Note:** Remote scripts are fetched, saved to a temporary file, executed, and then cleaned up automatically.

### Conditional Execution

```json
{
  "id": "optional-setup",
  "name": "Optional Setup Script",
  "type": "exec-file",
  "config": {
    "file": "scripts/optional-setup.js",
    "runtime": "node",
    "condition": "includeOptionalSetup === true"
  }
}
```

### Bash Script Execution

```json
{
  "id": "run-bash-script",
  "name": "Run Bash Setup",
  "type": "exec-file",
  "config": {
    "file": "scripts/setup.sh",
    "runtime": "bash",
    "args": ["{{projectName}}"]
  }
}
```

### PowerShell Script Execution

```json
{
  "id": "run-powershell-script",
  "name": "Run PowerShell Setup",
  "type": "exec-file",
  "config": {
    "file": "scripts/setup.ps1",
    "runtime": "pwsh",
    "parameters": {
      "ProjectName": "{{projectName}}"
    }
  }
}
```

### Complete Example with Prompts

```json
{
  "prompts": [
    {
      "id": "projectName",
      "type": "input",
      "message": "What is your project name?",
      "default": "my-project"
    },
    {
      "id": "author",
      "type": "input",
      "message": "Author name?",
      "default": "Your Name"
    },
    {
      "id": "runSetup",
      "type": "confirm",
      "message": "Run setup script?",
      "default": true
    }
  ],
  "tasks": [
    {
      "id": "run-setup-script",
      "name": "Run Project Setup Script",
      "description": "Executes the project setup script with user-provided values",
      "required": true,
      "enabled": true,
      "type": "exec-file",
      "config": {
        "file": "scripts/setup.js",
        "runtime": "node",
        "args": ["--name={{projectName}}", "--author={{author}}"],
        "parameters": {
          "PROJECT_NAME": "{{projectName}}",
          "AUTHOR": "{{author}}"
        },
        "condition": "runSetup === true"
      }
    }
  ]
}
```

## Script Access to Variables

### Via Command-Line Arguments

Scripts can access interpolated arguments:

**Task config:**

```json
{
  "args": ["--name={{projectName}}", "--author={{author}}"]
}
```

**Node.js script:**

```javascript
const args = process.argv.slice(2);
// args = ['--name=my-project', '--author=John Doe']
```

### Via Environment Variables

Scripts can access interpolated environment variables:

**Task config:**

```json
{
  "parameters": {
    "PROJECT_NAME": "{{projectName}}",
    "AUTHOR": "{{author}}"
  }
}
```

**Node.js script:**

```javascript
const projectName = process.env.PROJECT_NAME;
const author = process.env.AUTHOR;
```

**Bash script:**

```bash
#!/bin/bash
echo "Project: $PROJECT_NAME"
echo "Author: $AUTHOR"
```

## Remote vs Local Scripts

### Local Scripts

- Resolved relative to the task's source location
- Supports relative paths: `'./scripts/setup.js'`
- Supports absolute paths
- File must exist or an error is thrown

### Remote Scripts

- Fetched from HTTP/HTTPS URLs
- Saved to temporary file
- Executed
- Automatically cleaned up after execution
- Must be accessible without authentication

## Comparison with `exec` Plugin

| Feature                | `exec` Plugin       | `exec-file` Plugin                  |
| ---------------------- | ------------------- | ----------------------------------- |
| Inline commands        | ✅ Yes              | ❌ No                               |
| External script files  | ❌ No               | ✅ Yes                              |
| Remote scripts         | ❌ No               | ✅ Yes                              |
| Multiple runtimes      | ❌ No               | ✅ Yes                              |
| Variable interpolation | ✅ Yes (in command) | ✅ Yes (in file, args, params, cwd) |
| Environment variables  | ✅ Yes (inherited)  | ✅ Yes (custom parameters)          |

## Use Cases

1. **Project Initialization Scripts**

   ```json
   {
     "file": "scripts/init-{{framework}}.js",
     "runtime": "node",
     "args": ["--name={{projectName}}"]
   }
   ```

2. **Remote Configuration Scripts**

   ```json
   {
     "file": "https://example.com/configs/setup.js",
     "runtime": "node"
   }
   ```

3. **Cross-Platform Scripts**

   ```json
   {
     "file": "scripts/setup.ps1",
     "runtime": "pwsh",
     "parameters": { "Name": "{{projectName}}" }
   }
   ```

4. **Conditional Setup**
   ```json
   {
     "file": "scripts/advanced-setup.js",
     "runtime": "node",
     "condition": "advancedMode === true"
   }
   ```

## Using exec-file in Variables and Prompts

The exec-file plugin can also be used in **variable values** and **prompt defaults** to dynamically resolve values by executing script files.

### In Variables

Execute a script file and use its output as a variable value:

```json
{
  "variables": [
    {
      "id": "currentVersion",
      "value": {
        "type": "exec-file",
        "file": "scripts/get-version.js"
      }
    },
    {
      "id": "gitBranch",
      "value": {
        "type": "exec-file",
        "file": "scripts/get-branch.sh",
        "runtime": "bash"
      }
    },
    {
      "id": "envConfig",
      "value": {
        "type": "exec-file",
        "file": "scripts/get-config.js",
        "args": ["--env={{environment}}"],
        "parameters": {
          "CONFIG_PATH": "{{configPath}}"
        }
      }
    }
  ]
}
```

**Script Output Parsing:**

- **JSON**: Automatically parsed if output starts with `{` or `[`
- **Numbers**: Automatically parsed if output matches number pattern
- **Booleans**: `true`/`false` strings converted to boolean
- **Strings**: Everything else returned as string

Example script for version (scripts/get-version.js):

```javascript
const package = require('./package.json');
console.log(package.version); // Output: "1.2.3"
```

### In Prompt Defaults

Execute a script to provide dynamic default values for prompts:

```json
{
  "prompts": [
    {
      "id": "projectName",
      "type": "input",
      "message": "Project name:",
      "default": {
        "type": "exec-file",
        "file": "scripts/suggest-name.js"
      }
    },
    {
      "id": "gitUser",
      "type": "input",
      "message": "Git username:",
      "default": {
        "type": "exec-file",
        "file": "scripts/get-git-user.sh",
        "runtime": "bash"
      }
    },
    {
      "id": "useTypeScript",
      "type": "confirm",
      "message": "Use TypeScript?",
      "default": {
        "type": "exec-file",
        "file": "scripts/detect-ts.js"
      }
    }
  ]
}
```

Example script for boolean default (scripts/detect-ts.js):

```javascript
const fs = require('node:fs');

const hasTsConfig = fs.existsSync('tsconfig.json');
console.log(hasTsConfig); // Output: true or false
```

### Runtime Auto-Detection in Values

Runtime is automatically detected from file extension, even in variables and prompts:

```json
{
  "variables": [
    {
      "id": "nodePath",
      "value": {
        "type": "exec-file",
        "file": "scripts/find-node.sh"
        // Runtime automatically detected as 'bash' from .sh extension
      }
    }
  ]
}
```

## Best Practices

1. **Use Relative Paths**: Reference scripts relative to your template for portability
2. **Version Remote Scripts**: Use versioned URLs or commit hashes for remote scripts
3. **Error Handling**: Scripts should return appropriate exit codes
4. **Security**: Only execute trusted scripts, especially from remote sources
5. **Cross-Platform**: Use Node.js for cross-platform scripts when possible
6. **Documentation**: Document what your scripts do and what arguments they accept

## Error Handling

The plugin will throw an error if:

- The script file doesn't exist (local files)
- The remote URL fails to fetch (remote files)
- The script execution fails (non-zero exit code)
- The runtime is not installed on the system

## Security Considerations

- **Local Scripts**: Ensure scripts are from trusted sources
- **Remote Scripts**: Only use HTTPS URLs and verify the source
- **Code Review**: Review scripts before executing them
- **Execution Context**: Scripts run with the same permissions as the scaffoldfy process

## See Also

- [exec Plugin](TASK_TYPES.md#exec) - For inline shell commands
- [Prompts](PROMPTS.md) - For collecting user input
- [Variables](VARIABLES.md) - For defining reusable values
- [Conditional Execution](FEATURES.md) - For advanced conditional logic
