---
'@pixpilot/scaffoldfy-configs': minor
---

workspace-package-generator: resolve `catalog:` references in the generated package.json against the catalogs defined in the workspace's pnpm-workspace.yaml, so workspaces can group catalogs by usage instead of matching the template's catalog names.
