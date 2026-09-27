---
'@pixpilot/scaffoldfy': minor
---

Add an `answers` field to configs for pre-set prompt answers keyed by prompt id, including prompts from extended configs. Answered prompts are not asked; CLI answer flags and `--set` override them, and `--help` shows which prompts a config answers.
