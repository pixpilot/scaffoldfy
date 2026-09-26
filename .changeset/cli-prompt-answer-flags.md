---
'@pixpilot/scaffoldfy': minor
---

Answer any prompt, including prompts from extended configs, with a flag named after its id (`--keepExamplePackages`, `--keep-example-packages=false`, `--no-keep-example-packages`, `--project-name my-app`). `--help` combined with `--config` now also lists the config's prompts. Unknown flags are now reported as errors instead of being rejected by the argument parser, and `--set` keys accept kebab-case ids too.
