---
title: Fighting AI Slop
description: Actual has started receiving what can only be described as AI slop — pull requests and issues generated entirely by automated systems with no human involvement. We're taking a stand.
date: 2025-11-15T10:00
slug: fighting-ai-slop
tags: [announcement]
hide_table_of_contents: false
authors: MatissJanis
---

Actual has started receiving what can only be described as *AI slop* — pull requests and issues generated entirely by automated systems with no human involvement. These require the same amount of triage and review time as genuine contributions, but add no value. Every minute spent dealing with machine-generated junk is time not spent improving Actual itself.

<!--truncate-->

## The Problem

To be clear: AI is a useful tool. We use it ourselves to draft code, fix bugs, and build features. Heck - even this article was written with the assistance of AI. But the difference is that a human is always in charge. We review, test, and take responsibility for what we merge. What we are seeing now is the opposite — unreviewed output blindly pushed upstream (i.e. opened as PRs or issues). That is not contribution; it's pollution.

## Our Policy

From this point on, we will close any PRs or issues that appear to be 100% AI-generated with no sign of human oversight. This isn't about being harsh, it's about protecting the limited time our maintainers have to review genuine contributions.

## Why This Matters

Every AI slop PR or issue requires the same triage and review time as genuine contributions. With limited maintainer bandwidth, this directly impacts:
- Response times for real issues and feature requests
- Time available for reviewing legitimate contributions
- Overall project velocity

We want to spend our time improving Actual, not filtering through automated noise.

## How to Contribute Properly with AI

If you're using AI to help with contributions, that's perfectly fine! Just make sure you:
- **Review everything** before submitting, understand what changed and why
- **Test your changes** - don't assume AI-generated code works correctly
- **Respond to feedback** - be ready to discuss, iterate, and improve your contribution
- **Take responsibility** - you're the one submitting it, so make sure it's something you stand behind
- **Tag them with "ai generated"** (This isn't something we can truly enforce, but it's a gesture of good will — it helps everyone in the review process know when AI was involved.)

For more details on how to contribute, see our [contributing guidelines](/docs/contributing/).

## A Silver Lining

One small silver lining: our "WIP" (Work-In-Progress) workflow — which requires contributors to manually remove the "WIP" prefix before a PR can be reviewed — has proven effective at filtering out AI bots. It's an unintentional captcha we have built. Many of them can't complete that simple step, so their PRs go stale and close automatically.

Even so, it would be better not to receive AI slop at all.

## Keep It Human

Please, if you're using AI to help contribute, stay in the loop. Review, edit, and understand what you're submitting. Actual is built by humans, for humans. Keep it that way.

We're grateful for all genuine contributions, whether AI-assisted or not. The key is human oversight and understanding. Thank you for helping keep Actual focused on what matters.

