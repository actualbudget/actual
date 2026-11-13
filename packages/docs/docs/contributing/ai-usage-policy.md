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

When it comes to interacting with the project — code review replies, issue comments, and discussion threads — we expect to interact with real humans, not with AI-generated replies.

Please do not:

- Paste a reviewer's comment back into an AI and post the raw output as your reply.
- Generate issue descriptions wholesale from AI without reading and editing them yourself.
- Use AI to argue with maintainers on your behalf.

Maintainer bandwidth is limited, and the conversation around a change is where most of the value of code review lives. If that conversation is between an AI on one side and a human on the other, it stops being useful.

## Pull request descriptions

AI tools may help write a pull request description, within a fixed format. The pull request template has these rules, and an automated check enforces them:

- **Human Summary** — written by you, in your own words. A sentence or two on why the change is needed is enough. An AI tool must not write this section.
- **Description** and **Testing** — may be written with AI, but must stay short: at most 150 words in total. Testing should be step-by-step instructions a maintainer can follow to see the change for themselves, not a list of the commands you ran.
- **Proof** — every pull request that changes the app must show that it works. Verify your change in a real browser and add a before and an after screenshot, or a video, to the Proof section. Maintainers should not have to test your change by hand to see what it does, and pull requests without proof are not reviewed. If the change has nothing to show (for example a refactor), tick the "no user-visible effect" box instead.

You can fix a failing check by editing the pull request description; the check runs again automatically.

## Quality Over Quantity

Modern AI tools make it easy to generate a large number of changes very quickly. Please resist the temptation to open many pull requests at once — for example, by pointing an AI tool at the codebase and submitting whatever it produces.

A stack of simultaneous, similar pull requests from one author takes much longer for us to review than a single, well-tested change, and it is often a sign that the work has not been read or tested by a human. We would much rather receive one change that you understand and have verified than ten that you have not.

A good rhythm is to open one pull request, work with us to get it reviewed and merged, and only then open the next one. Pull requests that are low-effort or untested may be closed without a detailed review, and authors who repeatedly submit them may be blocked from contributing.

## You are responsible for what you submit

Before you open an issue or a PR, you should:

- **Understand the code.** Read what the AI produced. Be able to explain what each change does and why it is needed.
- **Verify it works.** Run it locally, run the tests, and confirm the behavior you are claiming.
- **Edit the prose.** AI-generated descriptions are often long, repetitive, or inaccurate. Trim them and make sure they match what the code actually does.

You are the author of the contribution. The AI is not.

## A note on automated AI agents

This page is for human contributors who are using AI as an assistant. Autonomous AI agents operating directly on this repository (for example, via Claude Code or Cursor Agents) follow a separate set of rules. Those rules live in [`AGENTS.md`](https://github.com/actualbudget/actual/blob/master/AGENTS.md) and [`.github/agents/pr-and-commit-rules.md`](https://github.com/actualbudget/actual/blob/master/.github/agents/pr-and-commit-rules.md).
