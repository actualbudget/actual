---
category: Bugfixes
authors: [deeferentleeg]
---

Fix the `category group` rule condition so it is evaluated consistently across all rule execution paths. Previously the condition only matched in the rule editor's preview/Apply (which resolves the category→group join via AQL) and silently failed through "Run rules" and automatic rule execution on save/import.
