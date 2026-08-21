---
category: Bugfix
authors: [StephenBrown2]
---

Fix "timestamp counter overflow" when a large sync is downloaded in a browser that reduces `Date.now()` precision, such as LibreWolf or Firefox with `privacy.resistFingerprinting` enabled
