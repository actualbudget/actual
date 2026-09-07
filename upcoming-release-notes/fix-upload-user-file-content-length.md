---
category: Bugfix
authors: [sharpbiztech]
---

Fix budget file uploads failing with `invalid content-length header` by letting fetch derive Content-Length in `upload()`
