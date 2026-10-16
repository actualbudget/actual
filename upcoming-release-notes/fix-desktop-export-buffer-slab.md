---
category: Bugfix
authors: [CloudCorpRecords]
---

Fix the desktop "Export data" file being padded with the whole buffer pool. The exported ZIP is now exactly the bytes of the file, and the save is properly awaited so failures can surface.
