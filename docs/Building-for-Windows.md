# How to build browser for Windows
Many of the build scripts are bash scripts and not natively invokable in Windows. To solve this, you can build the project using Git Bash.
1. Install [Git & Git Bash for Windows](https://git-scm.com/downloads)
2. Install Node v16.x (latest version 17.x does not work due to issue with crypto package)
3. Clone this repo
4. From the root of this repo, run `sh` to launch a bash shell
5. From inside the bash shell, run `yarn install`
6. From still inside the shell, run `yarn start:browser`
7. Open your browser to `localhost:3001`

# How to build electron for Windows
1. Follow steps 1 - 5 above.
2. Run `yarn start`
3. If you get an error from electron, run `yarn rebuild-electron` and rerun `yarn start`;

## rsync: command not found
If you run into this error, you will need to install the rsync binary to Git Bash. Follow the [directions here](https://prasaz.medium.com/add-rsync-to-windows-git-bash-f42736bae1b3). When you get to the final step - installing the libxxhash dll - rename the dll from `msys-xxhash-0.8.0.dll` to `msys-xxhash-0.dll`

