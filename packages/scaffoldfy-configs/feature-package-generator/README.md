# feature-package-generator

Generates `packages/<name>`, a feature package for a Stackforge workspace (`@internal/trpc`, `@internal/dashboard`, a `database` package):

| Path                         | Contents                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `src/db/`                    | `schema.ts` (tables) and `index.ts` (the `./db` entry point)                      |
| `src/services/`, `src/trpc/` | Use cases and `create<Name>Router()`                                              |
| `src/types/`, `src/client/`  | Browser-safe types and hooks                                                      |
| `src/ui/`, `src/paths.ts`    | `<Name>Screen`, `<NAME>_NAV_ITEM`, `<NAME>_PATH`                                  |
| `test/`                      | `db.ts` (PGlite via `@pixpilot/drizzle-test-pglite`), `db.test.ts`, `nav.test.ts` |

`catalog:` dependencies are pointed at the catalogs in your `pnpm-workspace.yaml`; then it runs `pnpm install`, `eslint --fix` and `prettier`.

```sh
npx @pixpilot/scaffoldfy@latest --config https://unpkg.com/@pixpilot/scaffoldfy-configs@latest/feature-package-generator/scaffoldfy.json --set featureName=knowledge
```

## Extend it

Create a config that `extends` this one, then override variables or tasks by id:

| Variable                                    | Default                      | Use                                                                                                                           |
| ------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `extraEntryPoints`                          | `[]`                         | More `exports` (`./<name>` → `src/<name>/index.ts`), listed between `./trpc` and `./types`; add a task that creates each file |
| `extraDependencies`, `extraDevDependencies` | `""`                         | Space-separated `name` or `name@spec`; no spec means `catalog:`                                                               |
| `packageName`                               | `@internal/{{featureName}}`  | Package name                                                                                                                  |
| `featureDirectory`                          | `packages/{{featureName}}`   | Where the package goes                                                                                                        |
| `featurePagePath`                           | `/dashboard/{{featureName}}` | The page the screen and nav item point at                                                                                     |
| `relativeRootPath`                          | `../../`                     | From the package to the workspace root, for the `format` script                                                               |

Every task id starts with `feature-`. Override one with a task of the same id (its `templateFile` resolves next to your config), e.g. `feature-test-db` to load a PGlite extension. Add notes to the generated README with an `append` task on `{{featureDirectory}}/README.md` that depends on `feature-readme`.

```jsonc
{
  "extends": "https://unpkg.com/@pixpilot/scaffoldfy-configs@<version>/feature-package-generator/scaffoldfy.json",
  "variables": [
    { "id": "extraEntryPoints", "value": { "type": "static", "value": ["jobs"] } },
    {
      "id": "extraDevDependencies",
      "value": { "type": "static", "value": "@electric-sql/pglite-pgvector" }
    }
  ],
  "tasks": [
    {
      "id": "feature-jobs",
      "name": "Create src/jobs/index.ts",
      "type": "create",
      "config": {
        "file": "{{featureDirectory}}/src/jobs/index.ts",
        "templateFile": "./templates/jobs.ts.hbs"
      }
    }
  ]
}
```

Your tasks run after this config's `feature-tidy` (lint and format), so keep their templates formatted.
