# Example: Remote Template with Template Files

This example demonstrates how remote templates can reference template files (`.hbs` files) that are hosted alongside them.

## Remote Template Structure

Suppose you have a GitHub repository at `https://github.com/your-org/templates` with the following structure:

```
templates/
├── base-node.json          # Main template file
├── tsconfig.hbs            # TypeScript config template
├── package.json.hbs        # Package.json template
└── shared/
    ├── readme.hbs          # Shared README template
    └── gitignore.hbs       # Shared .gitignore template
```

## Remote Template (`base-node.json`)

```json
{
  "prompts": [
    {
      "id": "projectName",
      "type": "input",
      "message": "Project name?",
      "required": true
    },
    {
      "id": "description",
      "type": "input",
      "message": "Project description?",
      "default": "A new Node.js project"
    },
    {
      "id": "author",
      "type": "input",
      "message": "Author name?",
      "required": true
    }
  ],
  "tasks": [
    {
      "id": "create-tsconfig",
      "name": "Create TypeScript Config",
      "description": "Generate tsconfig.json",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": {
        "file": "tsconfig.json",
        "templateFile": "./tsconfig.hbs"
      }
    },
    {
      "id": "create-package-json",
      "name": "Create package.json",
      "description": "Generate package.json",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": {
        "file": "package.json",
        "templateFile": "./package.json.hbs"
      }
    },
    {
      "id": "create-readme",
      "name": "Create README",
      "description": "Generate README.md",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": {
        "file": "README.md",
        "templateFile": "../shared/readme.hbs"
      }
    },
    {
      "id": "create-gitignore",
      "name": "Create .gitignore",
      "description": "Generate .gitignore",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": {
        "file": ".gitignore",
        "templateFile": "../shared/gitignore.hbs"
      }
    }
  ]
}
```

## Template Files

### `tsconfig.hbs`

```handlebars
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### `package.json.hbs`

```handlebars
{
  "name": "{{projectName}}",
  "version": "0.1.0",
  "description": "{{description}}",
  "author": "{{author}}",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### `shared/readme.hbs`

```handlebars
# {{projectName}}

{{description}}

## Author

{{author}}

## Installation

\`\`\`bash
npm install
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## License

MIT
```

### `shared/gitignore.hbs`

```
node_modules/
dist/
*.log
.DS_Store
.env
```

## Using the Remote Template

In your local project, create a `template.json`:

```json
{
  "extends": "https://raw.githubusercontent.com/your-org/templates/main/base-node.json",
  "tasks": [
    {
      "id": "install-deps",
      "name": "Install Dependencies",
      "description": "Install npm dependencies",
      "required": true,
      "enabled": true,
      "type": "exec",
      "config": {
        "command": "npm install"
      }
    }
  ]
}
```

Run the CLI:

```bash
npx @pixpilot/scaffoldfy
```

## What Happens

1. The CLI fetches `base-node.json` from GitHub
2. For each task with a `templateFile`:
   - `./tsconfig.hbs` → `https://raw.githubusercontent.com/your-org/templates/main/tsconfig.hbs`
   - `./package.json.hbs` → `https://raw.githubusercontent.com/your-org/templates/main/package.json.hbs`
   - `../shared/readme.hbs` → `https://raw.githubusercontent.com/your-org/templates/shared/readme.hbs`
   - `../shared/gitignore.hbs` → `https://raw.githubusercontent.com/your-org/templates/shared/gitignore.hbs`
3. Fetches each template file from its remote location
4. Processes them with Handlebars (since they end in `.hbs`)
5. Generates the output files in your project

## Benefits

- **Centralized Templates**: Maintain templates in one repository
- **Easy Updates**: Update templates in one place, all projects benefit
- **Version Control**: Use Git tags/branches for template versions
- **Sharing**: Share templates across teams and projects
- **No Local Files Needed**: Everything is fetched automatically
