---
name: writing-actual-docs
description: Use whenever creating, updating, editing, drafting, restructuring, or fixing documentation in the Actual Budget repo — specifically anything under `packages/docs/` (the Docusaurus site published at actualbudget.org/docs) or any change to `.md` / `.mdx` files in that package. Trigger for asks like "add a doc page for X", "update the FAQ", "write a guide for the new feature", "document this setting", "fix the docs about Y", "add a contributing page", or any work on the docs site, even when the user does not explicitly mention style, structure, or conventions. Actual's docs follow strict Docusaurus conventions (front matter, heading levels, image placement and naming, admonition syntax, Title Case, tone of voice, spelling allowlist) and writing them without consulting the project's style guide reliably produces output that fails review and needs to be redone.
---

# Writing Actual Budget Documentation

Before writing or editing any documentation file under `packages/docs/`, read the project's style guide:

**`packages/docs/docs/contributing/writing-docs.md`**

It is the authoritative source for front matter, heading rules, folder structure, tone, Docusaurus admonitions and components, image placement and annotation, spelling allowlist, and naming standards — there is no point restating it here because it will go stale faster than the source.

## How to apply it

1. Read `writing-docs.md` in full before drafting.
2. When the guide does not cover something, match the closest existing document in the same section rather than inventing a new pattern — site-wide consistency matters more than a marginally better local choice.
3. For new screenshots, follow both the placement rule (`/static/img/<section>/<doc-prefix>-...png`) and the annotation guidance from the guide. Annotate any screenshot showing more than one element the reader needs to distinguish.
4. Before declaring the work done, sanity-check the file against the guide's structural rules: exactly one H1, Title Case headings, no time-bound phrasing, internal links written as relative file paths with the `.md` extension (not `/docs/...` URLs), images referenced from the correct path, and any new technical terms added to `.github/actions/docs-spelling/allow/keywords.txt` so the spell-check bot passes.

## Why this matters

The docs are user-facing and the audience is mixed — many readers are not developers, so the guide deliberately favors verbose, step-by-step explanations over terse expert prose. The structural rules are what Docusaurus and the spell-check bot rely on, so getting them wrong breaks the build or the rendered sidebar. Reading the guide once at the start of the task is much cheaper than having a maintainer flag a dozen style issues in review.
