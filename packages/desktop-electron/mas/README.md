# Mac App Store build

Mac App Store builds run inside the App Sandbox, which needs the entitlements
in this folder plus an app-group entitlement that electron-builder derives
from the provisioning profile at signing time. Without the app group Electron
aborts on launch (`bootstrap_check_in ... MachPortRendezvousServer:
Permission denied`).

- `yarn workspace desktop-electron build:mas` produces the App Store-signed
  `.pkg` in `dist/`. It needs the "Apple Distribution" and "Mac Installer
  Distribution" certificates in the keychain and the Mac App Store
  provisioning profile for `com.actualbudget.actual` saved here as
  `embedded.provisionprofile`. App Store-signed builds only launch when
  installed from TestFlight or the App Store.
- `yarn workspace desktop-electron build:mas-dev` produces the same sandboxed
  app signed with the "Apple Development" certificate so it launches
  locally. It needs a macOS App Development provisioning profile that lists
  this Mac, saved here as `development.provisionprofile`.

Both profiles are git-ignored; download them from
developer.apple.com/account/resources/profiles.
