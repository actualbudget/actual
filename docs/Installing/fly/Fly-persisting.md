---
title: 'Persisting the data in Fly'
---

## Persisting the data in Fly

When we update Actual, if we don't persist the data it will be erased each time we come to update.

1. Run the following command

   ```cmd
   flyctl volumes create actual_data --region lhr
   ```

   This will create a volume in the london region. Replace `lhr` with another region code if
   desired.

   ![](/img/fly/cmd-19.png)

1. You should then get a message to say it was successful

   ![](/img/fly/cmd-20.png)

1. Open up `fly.toml` in notepad - you can do this from the command line
   ```cmd
   notepad fly.toml
   ```
1. Add the following to the file

   ```toml
   [mounts]
       source="actual_data"
       destination="/data"
   ```

   If you created a volume with a different name, put that in the source. Save the file.

   ![](/img/fly/cmd-21.png)

1. Now from the command prompt run

   ```cmd
   flyctl deploy
   ```

   ![](/img/fly/cmd-22.png)

   Your application should be re-deployed with the updated configuration

   ![](/img/fly/cmd-23.png)

If all went well, you should now be able to see your volume from the fly.io dashboard.

![](/img/fly/fly-dash-3.png)
