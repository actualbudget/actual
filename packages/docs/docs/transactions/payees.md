# Payees

A payee is a description of the source of a transaction. Actual provides a powerful way of managing payees.

When importing transactions, by default Actual will create new payees based on the imported name. Often this ends up with some ugly names like `Target Debit Crd Ach Tran Co Id:Xxxxx15170`. With payee management, you can clean these names up, set rules for how payees are resolved, and even set a default category to use.

:::info[Payee Management]

To manage payees, either select the **More >  Payees** from the sidebar or click the **Manage Payees** button when editing a transaction's payee.

:::

## How Payees Work

When importing transactions from a file, Actual tries to automatically match the imported names to existing payees. It does this by running through **rules** that you can edit. If no existing payee is found, it will create one.

If a payee is found with an exact match as the imported name, it will always use that payee. Otherwise, it will look for payees with rules that match. These rules specify whether it should match a string exactly, or if it should contain a string. For example, a **Target** payee might have a rule that says "if a name contains 'Target', use this payee", and the ugly payee above would be resolved to the **Target** payee.

When a payee is matched, if it has a **default category** the transaction will automatically be assigned to it.

:::tip[Category Learning]

Actual defaults with Category Learning enabled. You can find this setting in the bottom left corner of the Payees page. A more in depth discussion of Payee Rules and Category Learning can be found in the [Rules](docs/budgeting/rules/index.md) documentation. You can turn this off for one, several or all Payees. [Learn more](docs/budgeting/rules/index.md#managing-rules)

:::

## Editing a Payee

1. Open the **Payees** page
2. To **rename** a payee, click the name and type in a new one.
3. To **delete** a payee, select it and press the **1 payee** button at the top-left, just under "Payees" and select **Delete**.
4. To mark a payee as a **favorite**, select it and press the **1 payee** button in the top-left and select **Favorite**. This will make it appear at the top of the suggestions box when entering a payee in the account ledger.
5. Edit the rules by clicking on the "associated rules" button and a box will appear with the list of rules to match this payee with.
6. Create a new rule by clicking on the "Create rule" button and the [Rule](docs/budgeting/rules/index.md) creation box will appear.

## Merging Payees

A powerful feature is merging payees. You may already have months worth of data and a lot of ugly **Morrisons** payees that all vary slightly. You may want to merge all of these together into one payee.

1. Open the **Payees** page
  
2. Type "Morrisons" into the filter to only show those payees.

![Image searching for a Payee](/img/payees/MergePayeesSearch.png)

3. Click the checkbox in the table header next to the **Name** column to select all of the different variations of "Morrisons"

![Image selecting Payees](/img/payees/PayeesSelected.png)

4. Click the button in the top-left to open the menu, and select **Merge**

![Image merging payees](/img/payees/MergePayeesOption.png)

5. All of the payees will merge into one. Actual will choose one of the payee names to retain but you can edit the payee name by clicking it and typing in the desired name for the final payee.

![Image of merged Payee](/img/payees/PayeesMerged.png)

You can individually select payees and merge them if you like, but filtering & merging is a powerful way to quickly clean up your payees.

## Transfer Payees

[Transfers](./transfers.md) are just special payees that indicate which account to transfer to/from. Since they are payees, you can create rules like normal which will automatically create transfers. You will find them at the bottom of the **Payees** page if you want to create custom rules.

![Image of Payee Page with transfers](/img/payees/payee-transfers.png)
