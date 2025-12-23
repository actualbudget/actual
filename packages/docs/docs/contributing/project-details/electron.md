# Electron Notes

- Generally speaking, it is unlikely that features/fixes you contribute to actual will require electron-specific changes. If you think that is likely feel free to discuss on GitHub or in the actual discord.

- Details of the motivation behind the usage of WebSockets in the electron app can be found in the [Pull Request](https://github.com/actualbudget/actual/pull/1003) where the changes were made.

- Due to Electron security requirements there are some restrictions on what can be passed from front-end to (local) back-end. Generally limited to strings/ints via the `ipcRenderer`

- Making changes to the `global.Actual` object MUST happen inside the preload script. Due to electron security requirements this object is siloed and can only pass messages via `ipcRenderer`
