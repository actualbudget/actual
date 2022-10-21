---
title: 'How To Build Browser For Windows'
---

Many of the build scripts are bash scripts and not natively invokable in Windows. To solve this, you can build the project using Git Bash.
1. Install [Git & Git Bash for Windows](https://git-scm.com/downloads)
2. Ensure you have activated [Developer Mode](https://docs.microsoft.com/en-us/windows/apps/get-started/enable-your-device-for-development)
3. Install Node v16.x (latest version 17.x does not work due to issue with crypto package)
4. Clone this repo
5. Using Git Bash, change to the the root of this repo
6. From inside the bash shell, run `yarn install`
7. From still inside the shell, run `yarn start:browser`
8. Open your browser to `localhost:3001`

# How to build electron for Windows
1. Follow steps 1 - 6 above.
2. Run `yarn start`. If you get an error about bundle.desktop.js, just CTRL+C and rerun `yarn start`.
3. If you get an error from electron, run `yarn rebuild-electron` and rerun `yarn start`;

## rsync: command not found
If you run into this error, you will need to install the rsync binary to Git Bash. Follow the [directions here](https://prasaz.medium.com/add-rsync-to-windows-git-bash-f42736bae1b3).