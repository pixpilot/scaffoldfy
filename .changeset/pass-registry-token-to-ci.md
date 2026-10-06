---
'@pixpilot/scaffoldfy-configs': patch
---

fix(pixpilot-changesets-release): pass secrets to the reusable CI workflow and the registry token to the GitHub Packages release install, so `@pixpilot-private` dependencies no longer fail with a 401
