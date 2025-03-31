# Pluggy.ai Setup

:::note
Client Version 25.4.0 and  
Server Version 25.4.0 or higher are required to use this feature.
:::

### Create CLIENT ID and CLIENT SECRET for Actual

1. Create an account at [https://pluggy.ai](https://pluggy.ai).
2. Sign in to the [Pluggy Console](https://console.pluggy.ai/) and create a new team.

    ![](/static/img/connecting-your-bank/pluggy-console-01.png)

3. In the Pluggy Console, create an **Application** before generating API keys:
   - Click **Applications** in the top bar and create a new application.
   - Once created, you will see the **Client ID** and **Client Secret**.

    ![](/static/img/connecting-your-bank/pluggy-console-02.png)

4. Store both values securely. You will need them in Actual.

---

### Setup Meu Pluggy

*Meu Pluggy* is a free integration provided by Pluggy.ai for developers. You need to sync your bank using this tool to access it for free.

1. Visit [Meu Pluggy](https://meu.pluggy.ai) and log in or sign up.
2. Follow the instructions provided on the official [github repository](https://github.com/pluggyai/meu-pluggy).

:::info
Please note, you will only be able to connect your account to meu.pluggy.ai while your pluggy.ai trial period is active so please complete this step promptly. Once the trial period lapses, the account will remain connected but the connector list configuration will not be editable.

![](/static/img/connecting-your-bank/pluggy-trial-warning.png)
:::

3. After completing the steps in *item 2*, return to the Pluggy Console. Go to the application you created and click "Ir para Demo" to open the demo app.
4. In the top right corner, open the three-dot menu. Open it and click **Copiar Item ID** from your bank sync to the clipboard. You'll need this to complete your Pluggy.ai bank sync setup.

![](/static/img/connecting-your-bank/pluggy-console-03.png)

---

### Set Up Pluggy in Actual

1. In Actual, click **“+ Add account”** at the bottom of the sidebar.

    ![](/static/img/connecting-your-bank/connecting-your-bank-02.png)

2. Select **“Set-up Pluggy for bank-sync.”**

    ![](/static/img/connecting-your-bank/pluggy-setup-modal-setup.png)

3. In the dialog that appears, enter:
   - **Client ID**: From your Pluggy Console
   - **Client Secret**: From your Pluggy Console
   - **Item IDs**: Comma-separated if entering more than one

    ![](/static/img/connecting-your-bank/pluggy-setup-modal.png)

4. Click **Save**. The credentials will be securely stored on the server.

---

### Link Accounts with Pluggy

1. In Actual, link a bank account (existing or new):
   - For an **existing account**, click it, then click the `...` (kebab menu) and choose **Link Account**.

     ![](/static/img/connecting-your-bank/connecting-your-bank-01.png)

   - For a **new account**, click **“+ Add account”** in the sidebar.

     ![](/static/img/connecting-your-bank/connecting-your-bank-02.png)

2. Select **Link your bank account** with Pluggy.ai.

    ![](/static/img/connecting-your-bank/pluggy-setup-add-account.png)

3. A list of accounts from your Pluggy connection will appear.
4. Click **Set up bank-sync** next to the one you want to sync.

    ![](/static/img/connecting-your-bank/pluggy-setup-modal-link-account.png)

---

### Pluggy Notes & Limitations

1. Item IDs are associated with user-authorized connections and will expire if access is revoked or the token expires.
2. Use the sandbox environment for testing — test credentials are available in the [Pluggy Docs](https://docs.pluggy.ai/docs/quick-pluggy-introduction#sandbox-environment).
3. Data refresh frequency may vary by financial institution.

---

### Resetting Pluggy Credentials

To reset your Pluggy connection:

1. In Actual, click **Add Account**.
2. Next to “Set-up Pluggy for bank-sync”, open the three-dot menu.
3. Click **Reset Pluggy credentials**.

You'll then need to generate a new API key and obtain a new Item ID to reconnect.