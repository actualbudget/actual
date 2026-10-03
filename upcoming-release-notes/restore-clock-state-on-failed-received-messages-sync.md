---
category: Bugfixes
authors: [jsoberg]
---

Restores the clock state when messages fail to be applied in a sync. Timestamp.recv would otherwise advance the clock without applying messages, permanently bumping the clock state potentially causing clock drift
