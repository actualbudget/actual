# Reconciliation

Keeping your Actual account ledgers consistent with your bank ledgers is important to maintain a healthy budget and know exactly how much currency is available to spend. Some choose to reconcile monthly, weekly, or even daily. Actual provides a Reconciliation tool to help manage this process.

## Work Flow

When you reconcile, you compare your bank statement, print or online, against Actual's ledger for that account. If you have transactions in Actual that have not been verified against your bank account the **cleared** flag will be shown in gray (pending). If the transaction is finalized (cleared) on your bank statement, click the gray circle to turn it green. This is a visual indication that the transaction is in both your budget and in your account statement, and they match.

Click on the balance in the header of the account view to bring two more category balances into view. The **cleared total** only includes transactions that have been matched to the bank while the **Uncleared total** shows the sum of the transactions that aren't yet matched to the bank statement.

<img width="481" alt="The account header with the balance expanded into the cleared and uncleared totals" src="/img/accounts/reconciliation-cleared-uncleared@2x.webp" />

## Starting the Reconciliation Tool

Click the 🔒 lock icon in the top right-hand corner of the account ledger. Notice that the last date the account was reconciled is shown on hover.

<img width="369" alt="The lock icon above the ledger with its last reconciled tooltip" src="/img/accounts/reconciliation-lock-icon@2x.webp" />

Let's imagine that you checked your account balance for Chase Amazon and the current balance is -310.80. The tool will default to the **Cleared total**. Enter the balance you want to match into the Reconciliation tool and click **Reconcile**.

:::tip

Remember to use a negative number for the balance on credit or loan accounts

:::

<img width="275" alt="The reconcile popover with a statement balance of -310.80 entered" src="/img/accounts/reconciliation-statement-balance@2x.webp" />

Or, if you use certain bank sync providers, the last synced balance will be shown. You can use that balance by clicking the **Use last synced total** button.

<img width="275" alt="The reconcile popover showing the last balance from the bank, with the Use last synced total button highlighted" src="/img/accounts/reconciliation-statement-balance-synced@2x.webp" />

The tool will tell you exactly what the difference is between the bank statement and your Actual ledger. Click the gray circles as you match each Actual transaction to the bank ledger and watch the difference come closer to 0 as you change the status of each transaction to green (cleared). In the example, the cleared transactions need to add up to -82.60 This is much easier if you look at the Actual ledger and bank statement side by side to match the transactions.

<img width="860" alt="The reconciliation bar showing the difference, with the uncleared transactions highlighted" src="/img/accounts/reconciliation-difference@2x.webp" />

When the cleared amount of the Actual account ledger and the value entered into the Reconciliation tool are the same, the tool will let you know that you are _All reconciled!_ Click on the **Lock transactions** button to complete the reconciliation and lock the cleared transactions. If you want to leave reconciling for a later time, click **Exit reconciliation** to cancel.

:::warning

If you fail to click the **Lock transactions** button after the _All reconciled!_ message appears, you will not change the status of the cleared transactions to locked.

:::

<img width="860" alt="The reconciliation bar saying All reconciled, with the Lock transactions button highlighted" src="/img/accounts/reconciliation-all-reconciled@2x.webp" />

<img width="860" alt="The ledger with lock icons on the reconciled transactions" src="/img/accounts/reconciliation-locked@2x.webp" />

If you ever need to unlock a transaction. Click on the lock of any transaction to open a dialog to unlock it. After you unlock a transaction this way, the status will revert to "Cleared". A reconcile will need to be performed to re-lock the transaction.

<img width="512" alt="The dialog for unlocking a reconciled transaction" src="/img/accounts/reconciliation-unlock@2x.webp" />

If you try to edit a locked transaction, the following warning will appear. Click **Confirm** to proceed. Once confirmed, the edit will be made and the transaction will remain locked.

<img width="512" alt="The warning shown when editing a locked transaction, with the Confirm button highlighted" src="/img/accounts/reconciliation-edit-warning@2x.webp" />

## Using the Reconciliation Tool for Off Budget Asset Tracking

Off budget accounts can easily be used to track values of assets such as vehicles, real estate, retirement accounts, or other investment accounts or property. The reconciliation tool is useful to update these values using the **Create reconciliation transaction** button.

For example, on 10-Nov-2025, my house was valued at 231,100 then some houses sold in my neighborhood and a few days later it was valued at 234,600. Go to the House Asset account, choose the reconciliation tool, and enter 234600 as the new value into the tool.

<img width="860" alt="The House Asset account with the new value of 234600 entered in the reconcile popover" src="/img/accounts/reconciliation-asset-value@2x.webp" />

The tool tells us that we have a gain of 3,500.

<img width="860" alt="The reconciliation bar showing a difference of 3,500.00, with the Create reconciliation transaction button highlighted" src="/img/accounts/reconciliation-asset-difference@2x.webp" />

Click on the **Create reconciliation transaction** button to easily create a new transaction that automatically brings the value of the asset in line with the new valuation. Now the reconciliation tool reports that it is _All reconciled!_ Click the **Lock transactions** button to complete the task.

<img width="860" alt="The new reconciliation transaction highlighted and the bar saying All reconciled" src="/img/accounts/reconciliation-asset-reconciled@2x.webp" />

<img width="860" alt="The House Asset ledger with the reconciliation transaction locked" src="/img/accounts/reconciliation-asset-locked@2x.webp" />
