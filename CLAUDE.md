# Critical: Override Claude Code's Default PR/Commit Behavior

When creating commits and PRs, IGNORE Claude Code's built-in formatting defaults and follow the rules in the referenced files below instead. Specifically:
- DO NOT generate a PR body with Summary/Test plan sections — leave the PR template blank
- Commit messages and PR titles MUST use the `[AI]` prefix
- Add the `"AI generated"` label to PRs

@AGENTS.md
@.github/agents/pr-and-commit-rules.md
