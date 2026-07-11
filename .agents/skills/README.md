# Agent skills (Codex / ChatGPT desktop app mirror)

The canonical skills live in `.claude/skills/` (the Agent Skills open format:
one directory per skill with a `SKILL.md`). Claude Code discovers them there;
Codex-based harnesses — the Codex CLI, the Codex IDE extension, and the ChatGPT
desktop app — discover repository skills by scanning `.agents/skills/` instead,
and never read `.claude/skills/`.

This directory therefore mirrors every skill in `.claude/skills/` as a relative
symlink so both families of harnesses load the same, single copy.

- **Adding a skill**: create it in `.claude/skills/<name>/` and add the matching
  symlink here: `ln -s ../../.claude/skills/<name> .agents/skills/<name>`.
- **Windows**: symlinks require `git config core.symlinks true` and Windows
  Developer Mode (or an elevated shell) at clone time; otherwise git checks
  these out as plain text files and skill discovery silently degrades.
