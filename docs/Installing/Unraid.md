---
title: 'Unraid'
---

## Hosting Actual with [Unraid](https://unraid.net/)

## Initial setup 
### Using Community Apps

1.  If you don't have the CA plugin installed, install it now. Please read through all of the instructions before starting.
As always, backup your data by exporting from the web interface prior to making any configuration changes.
The current Actual Unraid CA was defined and maintained by hofq. Problems specifically with the
unraid template (not Actual itself) should be addressed to that repo, which can be found [here](https://github.com/hofq/docker-templates/issues/new/choose).
1. Search for "actualserver" in [Community Apps](https://unraid.net/community/apps?q=actualserver) and
select the one by Kippenhof (the only one at this time).
1. Click Install.

   ![image](https://user-images.githubusercontent.com/2792750/180338271-ca70f0d3-8f23-4d00-9cdb-ea011975dab3.png)


### Using Docker without Community Apps

1.  Create a new image and follow the guidelines below to configure the parameters
This image is not very complex, and can easily be configured in the web interface.
Follow the instructions below to configure the Repository, Data volume, WebUI port, and HTTPS keys necessary for running the image.


## Setting up data persistence

To avoid losing data when updating your image, it is recommended to setup a persistent volume.
This step is also necessary for sharing the HTTPS key/cert combination into the image.

1. Towards the bottom the template, select `Add another Path, Variable, Label or Device`,
1. In the popup, fill in the following details - changing your host location to match your setup:
   1. Name the path `Data`,
   1. Set the Container Path: `/data`,
   1. Set the Host Path (eg) `/mnt/user/appdata/actual`

   ![image](https://user-images.githubusercontent.com/2792750/180320756-0de951b2-67b6-4f77-acd4-b586822f3c96.png)

   This creates a directory named `actual` on your server and maps the container's `/data` folder to
   that directory on your Unraid server. This persists the data to the server. You can then make
   backups of the database from the host path you specified above.

1. Click "Apply", watch the container pull the image and start up. Login to Actual as outlined in
the other guides.

(Note: It's generally wise to have a manual backup strategy just in case. Two is one, one is none!)


## Changing the image source

If you'd like to point the Actual Community App to a different image, it's simple to do so.

1. First, backup your data. Safety first! See the documentation on exporting your data for specific
instructions.
1. On the settings page for the Actual CA, locate the `repository` field.
   ![image](https://user-images.githubusercontent.com/2792750/180340822-6e18e6ea-4556-43d6-8320-f90b640496c0.png)
1. Update this value to point to the dockerhub image of your choice. Eg, to use the official image
   change this value to [`jlongster/actual-server`](https://hub.docker.com/r/jlongster/actual-server) or [`ghcr.io/actualbudget/actual-server:latest`](https://ghcr.io/actualbudget/actual-server)
   ![image](https://user-images.githubusercontent.com/2792750/180340859-814bac85-090e-4ac6-a814-56f13c017845.png)
1. Confirm that the correct image is pulled. The `By:` section should read `By:
ghcr.io/actualbudget/actual-server:latest` (or whichever image source you have chosen to use).
![image](https://user-images.githubusercontent.com/2792750/180320492-0f5977e0-15e4-4640-9d07-db66806a33a2.png)

## Advanced
### Creating HTTPS Certificates

New versions of Actual depend on HTTPS to be enabled (see [Enabling SharedArrayBuffer Access](/Troubleshooting/SharedArrayBuffer)).  To create your own certificate on Unraid, open up a terminal into your server to follow these steps:

1.  Change directory into your shared data folder (see "Setting up data persistence" above)
1.  Create a new folder, "keys"
1.  Change directory into the "keys" folder
1.  Generate a certificate and private key combo by running `openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout actual.key -out actual.crt`
1.  In the Docker settings on the WebUI, create a new Variable `ACTUAL_HTTPS_KEY` and set the value to the path of the newly created key, `/data/keys/actual.key` (note: this is the value of the path _inside_ the docker container)
1.  Similarly to step 5, create a new Variable `ACTUAL_HTTPS_CERT` and set the value to `/data/keys/actual.crt`
1.  The next time the Actual Docker container is started, access the WebUI and accept the self-signed certificate.


### Map WebUI Port to container

Assuming the default port of 5006, map TCP host port 5006 to Docker port 5006.


### Add WebUI URL

By default, Actual server runs on port 5006.  To enable the WebUI button on the Docker page, go into the advanced Docker settings and set the WebUI to value `https://[IP]:[PORT:5006]/`


### If you already had an alternate image running:

1. BACKUP YOUR DATA. Safety first!
1. Stop your container and click `edit`.
1. Change the repository field to point to the dockerhub image of your choice. See the above section
   if needed.
1. Click Apply, and watch the container do its magic and swap out the image.
1. Restart the container if it didn't restart automatically.
1. On the `Docker` tab, enable `Advanced View` and confirm that you are now running the image you
   entered in step 3.
   ![image](https://user-images.githubusercontent.com/2792750/180320492-0f5977e0-15e4-4640-9d07-db66806a33a2.png)
1. Try logging in to your budget like normal. You may have to log in again or you may get a sync
error that says you need to revert to another version. Once you get through all that, you should be
good to go. If it went badly, hopefully you didn't skip step 1!
