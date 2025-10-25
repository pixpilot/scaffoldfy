# @pixpilot/scaffoldfy

## 0.29.1

### Patch Changes

- rename globalVariables and globalPrompts to variables and prompts

## 0.29.0

### Minor Changes

- implement topological sorting for templates

## 0.28.0

### Minor Changes

- enhance validation for 'exec' type commands

## 0.27.0

### Minor Changes

- add debug logging functionality

## 0.26.0

### Minor Changes

- simplify CLI with unified --config option

## 0.25.0

### Minor Changes

- update task types and documentation

## 0.24.1

### Patch Changes

- remove built-in global configuration property

## 0.24.0

### Minor Changes

- Implement topological sorting for template dependencies

## 0.23.0

### Minor Changes

- Implement lazy evaluation for template enabled conditions

## 0.22.0

### Minor Changes

- unit tests for various plugins: regex-replace, rename, replace-in-file, and write
- add allowCreate option to control file creation behavior

## 0.21.0

### Minor Changes

- 5d75108: new release

## 0.20.0

### Minor Changes

- b7c7768: new release

## 0.19.3

### Patch Changes

- remove placeholder property from input prompts

## 0.19.2

### Patch Changes

- update task config validation to include new task types

## 0.19.1

### Patch Changes

- add `$schema` to required properties in tasks schema
- cast task.config as unknown before DockerConfig

## 0.19.0

### Minor Changes

- bedd5a3: release

## 0.18.1

### Patch Changes

- handle unknown default value types more safely

## 0.18.0

### Minor Changes

- add conditional default configuration for prompts

## 0.17.0

### Minor Changes

- make `description`, `required`, and `enabled` fields optional with defaults
- 6b773bd: new release

### Patch Changes

- update ID validation rules to enforce valid JavaScript identifiers

## 0.16.0

### Minor Changes

- standardize string quotes and improve test readability

## 0.15.2

### Patch Changes

- 703069a: release

## 0.15.1

### Patch Changes

- update README and documentation for npx usage

## 0.15.0

### Minor Changes

- Introduced function to ensure plugins are registered before task validation

## 0.14.0

### Minor Changes

- add custom error classes for better error handling

## 0.13.0

### Minor Changes

- implement override strategies for tasks, variables, and prompts

## 0.12.0

### Minor Changes

- add validation for unique IDs across tasks, variables, and prompts

## 0.11.0

### Minor Changes

- add TypeScript template file for Turbo generator

## 0.10.0

### Minor Changes

- refactor codebase to remove initialization state update terminology for generic task automation

## 0.9.0

### Minor Changes

- Introduce support for top-level prompts and conditional enabling for tasks
- Add support for global and variables in template tasks

### Patch Changes

- fix test for CI

## 0.8.0

### Minor Changes

- rename 'execute' type to 'exec' for consistency

## 0.7.0

### Minor Changes

- removed defined variable

## 0.6.0

### Minor Changes

- support loading templates from remote URLs

## 0.5.4

### Patch Changes

- Update README files to reflect package name change and enhance usage instructions

## 0.5.3

### Patch Changes

- Update README and example files to reflect package name change

## 0.5.2

### Patch Changes

- Adjusted README to reflect the new package name

## 0.5.1

### Patch Changes

- change package name from `scaffoldfy` to `@pixpilot/scaffoldfy`

## 0.5.0

### Minor Changes

- change package name from `@pixpilot/scaffoldfy` to `scaffoldfy`

## 0.4.0

### Minor Changes

- increase MAX_BUNDLE_SIZE_KB to 40

## 0.3.0

### Minor Changes

- rename repo/package, add docs

## 0.2.0

### Minor Changes

- add support for embedded prompts in task definitions

## 0.1.0

### Minor Changes

- add support for interactive prompts using `@inquirer/prompts`

## 0.0.4

### Patch Changes

- update script header and remove direct execution

## 0.0.3

### Patch Changes

- correct schema path and update file references

## 0.0.2

### Patch Changes

- replace `rimraf` with `fs.rmSync` for file deletion
