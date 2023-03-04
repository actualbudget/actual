---
title: 'Deploying Actual with Git'
---

# Deploying Actual on fly.io with git

### Installing Git On Your Local Machine

Download git for Windows from here: [https://git-scm.com/download/win](https://git-scm.com/download/win)

1. Identify the version that is suitable for your operating system

   If you are unsure if you are running 32bit run this command in the command prompt:
   ```cmd
   wmic os get OSArchitecture
   ```
   ![](/img/cmd-arch.png)
1. Download the setup file that is right for your system:

   ![](/img/git-download.png)

   It should then start downloading:

   ![](/img/git-download-progress.png)
1. Once it is done, open it up - if asked click yes that you are happy for it to make changes to
   your device.

   ![](/img/git-install-1.png)
1. Copy the settings as they are below and click next, next...

   ![](/img/git-install-2.png)

   ![](/img/git-install-3.png)

   ![](/img/git-install-4.png)

   ![](/img/git-install-5.png)

   ![](/img/git-install-6.png)

   ![](/img/git-install-7.png)

   ![](/img/git-install-8.png)

   ![](/img/git-install-9.png)

   ![](/img/git-install-10.png)

   ![](/img/git-install-11.png)

   ![](/img/git-install-12.png)

   ![](/img/git-install-13.png)

   ![](/img/git-install-14.png)

   ![](/img/git-install-15.png)

   ![](/img/git-install-16.png)

1. Then git should begin installing:

   ![](/img/git-install-17.png)
1. Open up a command prompt and type
   ```cmd
   git --version
   ```
   to make sure it has installed correctly. If it has, you should see a version number as below:

   ![](/img/git-install-18.png)

That is it, Git is now installed.

## Deploying Actual

I got Actual deployed to [fly.io](https://fly.io) below are the instructions I used - understandably
these are for Windows only but should work (with a few tweaks) for MacOSX & Linux.

1. Press start (or hit the windows key on your keyboard), type **cmd**

   ![](/img/windows-start-1.png)

   when CMD appears in the search results, **right click** it and run it as **Administrator**

   ![](/img/windows-start-2.png)
1. Navigate to the C:\ drive
   ```cmd
   cd C:\
   ```
   ![](/img/cmd-1.png)
1. Create a folder called GitHub. (`mkdir` is a command to *m*a*k*e a *dir*ectory)
   ```cmd
   mkdir github
   ```
   ![](/img/cmd-2.png)
1. Once that is complete run this command
   ```cmd
   flyctl auth login
   ```
   ![](/img/cmd-9.png)

   This should open a web browser and ask you to login - you will need to provide credit card
   details to proceed but actual shouldn't cost much if anything at all.

   ![](/img/cmd-10.png)
1. Now we need to move into the GitHub directory we just created on the C:\ drive, to do that we can
   use this command
   ```cmd
   cd C:\github
   ```
   ![](/img/cmd-3.png)

   **Note:** CD means *c*hange *d*irectory
1. Now run this command
   ```cmd
   git clone https://github.com/actualbudget/actual-server.git
   ```
   ![](/img/git-install-19.png)

   This will pull down the latest files for actual-server from the git hub repository to our local
   machine.
1. Then we need to move into that folder, to do that use this command
   ```cmd
   cd actual-server
   ```
   ![](/img/cmd-4.png)

   Let's check to make sure we are in the correct place
   ```cmd
   dir
   ```
   ![](/img/cmd-5.png)

   You should see a list of files, one of them being `fly.template.toml`. If you don't see them
   go back to step 6
1. Copy `fly.template.toml` that is in the folder called actual-server within C:\GitHub and copy it
   back into the same directory with the name `fly.toml`
   ```cmd
   copy fly.template.toml fly.toml
   ```
   ![](/img/cmd-6.png)
1. Open the fly.toml file in notepad or a text editor of your choice like Visual Studio Code
   ```cmd
   notepad fly.toml
   ```
   ![](/img/cmd-7.png)

   On line 1 change `app = "%NAME%"` to something of your choosing like `app = "Actual"` and save
   the file

   ![](/img/cmd-8.png)
1. Go back to the command prompt and run
   ```cmd
   flyctl launch
   ```
1. You will see a message that says `An existing fly.toml file was found for app Actual Budget ?
   Would you like to copy its configuration to the new app? (y/N)`

   Type Y and hit enter

   ![](/img/cmd-11.png)
1. It asked me to give my application a name, I just left it blank and it picked one for me. I did
   this because no matter what I typed it errored.

   ![](/img/cmd-12.png)
1. Select your location using the up/down arrow keys when prompted:

   ![](/img/cmd-13.png)
1. When prompted with `? Would you like to setup a Postgresql database now? (y/N)`

   Type N and press enter:

   ![](/img/cmd-14.png)
1. When prompted with `? Would you like to deploy now? (y/N)`

   Type Y and press enter:

   ![](/img/cmd-15.png)

   The application should begin deploying.

   ![](/img/cmd-17.png)
1. If you get a message about Windows Firewall, click 'Allow Access'

   ![](/img/cmd-16.png)

When complete you should see something like this:

![](/img/cmd-18.png)

## Configuring Actual

Now everything is setup and configured, you should now be able to navigate to Actual using the URL
provided by Fly in the dashboard.

1. To find that open [https://fly.io/dashboard](https://fly.io/dashboard) in a browser and click the
   application you created, in my case **myfirstbudget**, it might have a really random name if you
   left it blank a few steps ago

   ![](/img/fly-dash.png)
1. Once you are in there, you should see Hostname section under Application Information - click the
   link

   ![](/img/fly-dash-2.png)

       https://myfirstbudget.fly.dev

   This will now open Actual so we can start configuring it.
1. You should then see this screen

   ![](/img/actual-config-1.png)

   Click the 'Use this domain' link

   ![](/img/actual-config-2.png)
1. Set a password - remember this, you will need it in the future.

   ![](/img/actual-config-3.png)
1. If everything went well you should then be taken to your very first budget.

   ![](/img/actual-register.png)

Actual is now up and running. Congratulations!
