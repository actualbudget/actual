---
title: AI Usage Policy
---

Actual Budget welcomes contributions from everyone, including contributions that are created with the help of AI tools such as GitHub Copilot, Cursor, Claude, ChatGPT, and similar assistants. This page describes what we expect from contributors who use these tools.

## Using AI for code

It is OK to use AI to generate code, draft tests, fix bugs, or help you navigate the codebase. AI is a tool, and when it helps you ship a good change, we are happy to have it.

If you use an AI-powered editor like Cursor, see the [Cursor IDE guide](./leadership/cursor-ide.md) for setup tips.

Regardless of whether the code is written by you or by an AI, it still has to meet the project's standards:

- It must pass `yarn typecheck` and `yarn lint:fix`.
- Relevant tests should pass — see the [Testing Guide](./testing.md).
- It must follow the project's [Code Style and Conventions](./code-style.md).
- User-facing strings must be translated.

## Interacting with maintainers should be human

When it comes to interacting with the project — PR descriptions, code review replies, issue comments, and discussion threads — we expect to interact with real humans, not with AI-generated replies.

Please do not:

- Paste a reviewer's comment back into an AI and post the raw output as your reply.
- Generate issue or PR descriptions wholesale from AI without reading and editing them yourself.
- Use AI to argue with maintainers on your behalf.

Maintainer bandwidth is limited, and the conversation around a change is where most of the value of code review lives. If that conversation is between an AI on one side and a human on the other, it stops being useful.

## Disclose when AI was used

If AI was used to generate a significant portion of an issue, PR, or the code it contains, please say so in the submission. A short note in the PR description is enough — for example, "The initial implementation was drafted with Claude and then reviewed and edited by me."

Issues and pull requests that appear to be AI-generated but do not disclose it may be closed without review. Contributors who repeatedly submit undisclosed AI content, or who ignore this policy, may be blocked from contributing.

## You are responsible for what you submit

Before you open an issue or a PR, you should:

- **Understand the code.** Read what the AI produced. Be able to explain what each change does and why it is needed.
- **Verify it works.** Run it locally, run the tests, and confirm the behavior you are claiming.
- **Edit the prose.** AI-generated descriptions are often long, repetitive, or inaccurate. Trim them and make sure they match what the code actually does.

You are the author of the contribution. The AI is not.

## A note on automated AI agents

This page is for human contributors who are using AI as an assistant. Autonomous AI agents operating directly on this repository (for example, via Claude Code or Cursor Agents) follow a separate set of rules — they must prefix commits and PR titles with `[AI]` and apply the `AI generated` label. Those rules live in [`AGENTS.md`](https://github.com/actualbudget/actual/blob/master/AGENTS.md) and [`.github/agents/pr-and-commit-rules.md`](https://github.com/actualbudget/actual/blob/master/.github/agents/pr-and-commit-rules.md).
