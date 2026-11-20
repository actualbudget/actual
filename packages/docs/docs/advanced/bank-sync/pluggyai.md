# Pluggy.ai Setup

### Create CLIENT ID and CLIENT SECRET for Actual

1. Create an account at [https://pluggy.ai](https://pluggy.ai).
2. Sign in to the [Pluggy Dashboard](https://dashboard.pluggy.ai/) and create a new team.

   ![](/img/connecting-your-bank/pluggy-console-01.webp)

3. In the Pluggy Dashboard, create an **Application** before generating API keys:
   - Click **Applications** in the top bar and create a new application.
   - Once created, you will see the **Client ID** and **Client Secret**.

   ![](/img/connecting-your-bank/pluggy-console-02.webp)

4. Store both values securely. You will need them in Actual.

---

### Setup Meu Pluggy

_Meu Pluggy_ is a free integration provided by Pluggy.ai for developers. You need to sync your bank using this tool to access it for free.

1. Visit [Meu Pluggy](https://meu.pluggy.ai) and log in or sign up.
2. Follow the instructions provided on the official [github repository](https://github.com/pluggyai/meu-pluggy).

:::info
Please note, you will only be able to connect your account to meu.pluggy.ai while your pluggy.ai trial period is active so please complete this step promptly. Once the trial period lapses, the account will remain connected but the connector list configuration will not be editable.

![](/img/connecting-your-bank/pluggy-trial-warning.webp)
:::

3. After completing the steps in _item 2_, return to the Pluggy Dashboard. Go to the application you created and click "Ir para Demo" to open the demo app.
4. In the top right corner, open the three-dot menu. Open it and click **Copiar Item ID** from your bank sync to the clipboard. You'll need this to complete your Pluggy.ai bank sync setup.

![](/img/connecting-your-bank/pluggy-console-03.webp)

---

### Set Up Pluggy in Actual

Pluggy integration is experimental at this point, so before you can use it you need to enable it under Settings -> Advanced Settings -> Experimental Features -> Pluggy.ai Bank Sync

1. In Actual, click **"+ Add account"** at the bottom of the sidebar.

   <img width="240" alt="The sidebar with the Add account button at the bottom highlighted" src="/img/advanced/bank-sync/bank-sync-add-account@2x.webp" />

2. Select **Set up bank sync**. This opens the **Bank Sync** page in Settings.

   <img width="518" alt="The Add account dialog with the Set up bank sync button highlighted" src="/img/advanced/bank-sync/bank-sync-add-account-modal@2x.webp" />

3. Under **Providers**, click **Set up** on the Pluggy.ai card.

   <img width="640" alt="The Providers section of the Bank Sync page with Set up on the Pluggy.ai card highlighted" src="/img/advanced/bank-sync/pluggyai-set-up@2x.webp" />

4. In the dialog that appears, enter:
   - **Client ID**: From your Pluggy Dashboard
   - **Client Secret**: From your Pluggy Dashboard
   - **Item IDs**: Comma-separated if entering more than one

   <img width="510" alt="The Set-up Pluggy.ai dialog with empty Client ID, Client Secret and Item Ids fields" src="/img/advanced/bank-sync/pluggyai-setup-modal@2x.webp" />

5. Click **Save and continue**. The credentials will be securely stored on the server.

---

### Link Accounts with Pluggy

1. In Actual, link a bank account (existing or new):
   - For an **existing account**, click it, then click the `...` (kebab menu) and choose **Link account**.

     <img width="297" alt="The account menu with Link account highlighted" src="/img/advanced/bank-sync/bank-sync-link-account-menu@2x.webp" />

   - For a **new account**, click **"+ Add account"** in the sidebar, then **Set up bank sync**.

     <img width="240" alt="The sidebar with the Add account button at the bottom highlighted" src="/img/advanced/bank-sync/bank-sync-add-account@2x.webp" />

2. Click **Link bank account** on the Pluggy.ai card.

   <img width="662" alt="The Link account dialog with Link bank account on the Pluggy.ai card highlighted" src="/img/advanced/bank-sync/pluggyai-link-bank-account@2x.webp" />

3. A list of accounts from your Pluggy connection will appear.
4. Click **Set up bank sync** next to the one you want to sync.

   <img width="988" alt="The Link Accounts dialog listing Pluggy.ai accounts, with one Set up bank sync button highlighted" src="/img/advanced/bank-sync/pluggyai-link-accounts@2x.webp" />

---

### Pluggy Notes & Limitations

1. Item IDs are associated with user-authorized connections and will expire if access is revoked or the token expires.
2. Use the sandbox environment for testing — test credentials are available in the [Pluggy Docs](https://docs.pluggy.ai/docs/quick-pluggy-introduction#sandbox-environment).
3. Data refresh frequency may vary by financial institution.

---

### Resetting Pluggy Credentials

To reset your Pluggy connection:

1. In Actual, click **Add Account**.
2. Next to "Set-up Pluggy for bank-sync", open the three-dot menu.
3. Click **Reset Pluggy credentials**.

You'll then need to generate a new API key and obtain a new Item ID to reconnect.
