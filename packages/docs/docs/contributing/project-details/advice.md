# Important Advice

- Any changes made to the `global.Actual` object must happen inside the respective electron and browser preload scripts. Whilst re-assigning items will work in the browser it is not supported in electron.

- Similarly, and changes made to `global.Actual` should be manually tested on the electron builds as well as the browser.
