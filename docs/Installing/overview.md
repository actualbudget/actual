---
title: 'Installing Actual'
---

Unlike most web apps, you’ll need to install Actual on a computer to get the full benefit out of it. While you could use Actual without running a server, we strongly recommend a server to ensure that your budget is saved and can be synced across multiple browsers and devices.

While running a server can be a complicated endeavor, we’ve tried to make it fairly easy to set up and hands-off to maintain. Choose one of the following options to get started:

- If you’re not comfortable with the command line and are willing to pay a small amount of money to have your version of Actual hosted on the cloud for you, we recommend [PikaPods](PikaPods.md).
- If you’re willing to run a few commands in the terminal:
  - [Fly.io](fly/Fly.io.md) offers free cloud hosting. (Make sure you read the section about [persisting your data](fly/Fly-persisting.md)!)
  - You could [directly install Actual locally](Local/your-own-machine.md) on macOS, Windows, or Linux if you don’t want to use a tool like Docker. (This method is the best option if you want to contribute to Actual!)
  - If you want to use Docker, we have instructions for [running Actual directly](Docker.md) inside Docker or [behind an nginx proxy that offers HTTPS support](DockerWithNginx.md).
- If you have a home server or a NAS running [Unraid](Unraid.md) or [Synology](synology/synology.md), we have instructions for installing Actual on those platforms.

Once you’ve set up your server, you can [configure it](Configuration.md) to change a few of the ways it works.

If you have any other ways Actual can be hosted, please consider opening a pull request to add them to the documentation so that others can benefit from your experience.
