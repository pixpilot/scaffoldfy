---
'@pixpilot/scaffoldfy': patch
---

Variables that use a prompt answer in a `{{placeholder}}` (directly or through another variable) now resolve after prompts are collected, instead of interpolating empty strings before them. Each one's transformers run before the next resolves, so `{ "type": "interpolate", "value": "{{featureName}}" }` with `transformers: ["pascalcase"]` gives `SampleFeature`, and `{{featurePascal}}Screen.tsx` builds on it.
