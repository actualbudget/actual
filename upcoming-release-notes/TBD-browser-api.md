---
category: Enhancements
authors: [MatissJanis]
---

api: add browser build so `@actual-app/api` can run in the browser via sql.js / absurd-sql / IndexedDB alongside the existing Node.js / Electron support. Bundlers that honour the `browser` export condition will pick up the new `dist/browser.js` artifact automatically.
