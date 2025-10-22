# @pixpilot/scaffoldfy

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
