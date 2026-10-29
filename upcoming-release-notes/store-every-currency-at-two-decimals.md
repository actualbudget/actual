---
category: Bugfix
authors: [rapastranac]
---

Fix amounts in currencies without decimals (yen, won, rial) being shown or saved at the wrong scale. Re-enter budget, rule and schedule amounts typed in these currencies before this fix; goal templates are unaffected, and running them again corrects the amounts they set.
