# Docs spell-checking configuration

The documentation under `packages/docs` is spell-checked by the
[crate-ci/typos](https://github.com/crate-ci/typos) action, wired up in
[`.github/workflows/docs-spelling.yml`](../../workflows/docs-spelling.yml).

| File                     | Purpose                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------- |
| [typos.toml](typos.toml) | typos configuration: the allowlist of accepted words and the list of excluded files |

## How it works

typos only reports high-confidence misspellings from its built-in
correction dictionary, so — unlike the previous check-spelling setup — proper
nouns, bank codes, and abbreviations usually do **not** need to be added to an
allowlist. Add an entry only when typos flags something that is actually
correct.

### Allowing a word

Add it to `[default.extend-words]` in [typos.toml](typos.toml), mapped to
itself:

```toml
[default.extend-words]
HSA = "HSA"
```

### Excluding a file

Add a glob to `extend-exclude` under `[files]` in [typos.toml](typos.toml).

See the [typos documentation](https://github.com/crate-ci/typos/blob/master/docs/reference.md)
for the full configuration reference.

## Why not check-spelling?

The repository previously used `check-spelling/check-spelling`. That project's
upstream repository was archived and shipped a self-disabling "secpoll"
kill-switch following a maintainer-account compromise on 2026-06-16, which made
every workflow pinned to it fail fatally. typos is actively maintained and runs
entirely from the checked-out tree without any PR-comment or bot machinery.
