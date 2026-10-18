# FinTS Setup

<ExperimentalFeatureWarning />

:::warning
All functionality described here may not be available in the latest stable release. See [Experimental Features](../../experimental/index.md) for instructions to enable experimental features. Use the `nightly` images for the latest implementation.
:::

FinTS (formerly known as HBCI) is the online banking standard of German banks. Actual connects directly to your bank with the login you use for online banking. There is no third-party service in between, and nothing to pay.

FinTS works with most German Sparkassen, Volksbanken and Raiffeisenbanken, and many other German banks. It only downloads transactions; Actual never sends payments.

## What You Need

- A server running Actual. FinTS only works through the Actual server, because banks do not allow browsers to contact them directly.
- A **FinTS product registration number** (see below).
- The login you use for online banking: the bank code (BLZ), your login name and your PIN.
- A TAN method that is active for your online banking, for example pushTAN in your bank's app, photoTAN or chipTAN.

## Get a Product Registration Number

German banks only accept software that is registered with the Deutsche Kreditwirtschaft (the German banking associations). Each person who runs FinTS with Actual needs their own registration number:

1. Fill in the registration form on the [FinTS product registration page](https://www.hbci-zka.de/register/prod_register.htm). Registration is free.
2. Wait for the email with your 25-character registration number. This usually takes a few days.
3. After you receive the number, the banks still need to update their systems. This can take several more days, and occasionally a few weeks for some banks.

:::caution
The registration number is personal. Do not share it or publish it, for example in a screenshot or a public configuration file.
:::

## Enter the Registration Number

There are two ways to give Actual the registration number.

**In Actual** (requires an admin account):

1. Enable **FinTS Bank Sync** under **Settings → Show advanced settings → Experimental features**.
2. Go to **More → Bank Sync**.
3. In the **FinTS** card, click **Set up** and enter the registration number.

**In the server configuration**: set the environment variable `ACTUAL_FINTS_PRODUCT_ID`, or point `ACTUAL_FINTS_PRODUCT_ID_FILE` to a file that contains the number. See [Server Configuration](../../config/index.md#fints) for details. A number set this way cannot be changed from inside Actual.

## Add Your Bank Login

1. Go to **More → Bank Sync** and click **Link bank account** in the **FinTS** card.
2. Start typing your bank's name, city or bank code (BLZ) into the **Bank** field and choose your bank from the suggestions. Actual includes the list of German FinTS banks and takes your bank's FinTS server address from it, so you do not need to enter it.
3. Only if your bank is not in the list, or you click **Use a different address**, enter the **FinTS server address** of your bank. Banks publish it on their website, often as "FinTS" or "HBCI PIN/TAN" address.
4. Enter a **name** for the login, for example the name of your bank.
5. Enter your **login name or ID**, the same one you use for online banking.
6. Only enter a **customer ID** if your bank gave you one in addition to your login name.
7. Click **Save**.

Your PIN is not part of these settings. Actual asks for it when it contacts your bank.

If you have accounts at more than one bank, add a login for each bank.

## Link Your Accounts

1. Click **Link accounts** next to the bank login.
2. Enter your PIN and click **Log in**.
3. The first time, choose how you want to approve requests, for example pushTAN.
4. Approve the request. For an app-based method, confirm it in your banking app; the window continues automatically. For other methods, enter the TAN that your bank shows you.
5. Choose which bank accounts to link to which Actual accounts, the same way as for the other bank sync providers.

## Sync Your Accounts

Click **Sync** as usual. When your bank needs something from you, Actual asks for it while syncing:

- **Your PIN**, the first time you sync after opening Actual or after about 15 minutes without syncing.
- **A TAN or an approval in your banking app**, when your bank requires it. Banks typically require this every 90 to 180 days, and sometimes when you download transactions that are older than 90 days.

If you close the window instead, Actual skips the accounts of that bank and marks them as needing attention. Click **Sync** again when you are ready.

### Remember the PIN

You can choose **Remember PIN on the server** when entering your PIN. Actual then stores the PIN on the server so you do not have to enter it again.

:::warning
The PIN is stored **unencrypted** in the server's database. Anyone with access to the server's files can read it. Only use this option if you fully trust the server and everyone who can access it.
:::

### A Wrong PIN

Banks block online banking after a few wrong PIN attempts. To protect you from this, Actual stops contacting your bank as soon as the bank rejects the PIN, and forgets a remembered PIN. Check your PIN carefully before you enter it again.

## Who Can Use a Bank Login

Bank logins belong to a budget file. Everyone who can open the budget file on the server can sync its accounts. Bank logins for budget files that are not stored on the server can only be used by admins.

## Limitations

- Only booked transactions are downloaded. Pending transactions do not show up until your bank books them.
- Credit cards with their own card statements and securities accounts are not supported.
- How far back you can download transactions depends on your bank. Many banks require an extra TAN for transactions older than 90 days.
