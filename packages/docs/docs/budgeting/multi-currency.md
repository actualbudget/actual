# Multi-Currency

The Actual Budget software is currency agnostic and does not support multi-currency. People are working on implementing currency support, but it will take time.
For the current status visit:
https://github.com/tlesicka/actual-budget-multicurrency-todo

## Method to Implement Multi-Currency Using Rule Templates

Until multi-currency is supported natively by Actual Budget, you can use the method described in this document to achieve similar results.

:::warning
This uses an _experimental feature_, so we're still working on finishing it. There may be bugs, missing functionality, or incomplete documentation, and we may decide to remove the feature in a future release. If you have any feedback, please [open an issue](https://github.com/actualbudget/actual/issues) or post a message in Discord.
:::

## Setup

1. Enable Rule Action Templating
   - In the sidebar, click on the _Settings->Show advanced settings->Experimental features_.
   - Click _I understand the risks, show experimental features_.
   - Click _Rule action templating_.

2. Create Foreign Currency Account
   - As an optional step, you can create a new account for the foreign currency, either:
     - Add a note to the account `#currency:XXX` where XXX is the 3-letter currency code as defined by [ISO 4217](https://en.wikipedia.org/wiki/ISO_4217) (i.e., EUR, USD, AUD, etc).
     - Name the account with the currency code in parens (i.e., `Australian Cash (AUD)`).

     ![Account Name and Notes](/img/multi-currency/account-name-and-note.webp)

     Neither is required, but naming the account this way or creating a note will allow a smooth transition when multi-currency is enabled.

3. Create Rules

   You will need to create two separate rules for each foreign currency account.

   **Rule 1:**

   ![Rule 1](/img/multi-currency/rule-1.webp)
   - From the Rules page, click on the _Create new rule_ button in the bottom right.
   - In the Rule Modal edit popup.
   - In _Stage of rule_ select **Post**.
   - _Conditions_ must be set to **if `All` of these conditions match**.
     - `Account` **is**, and select the foreign currency account.
     - `notes` **is not** set to _nothing_.
     - `notes` **does not contain** _FX rate:_
   - Under _Then apply these actions:_
     - Click the Template toggle button on the left side of the action, just to the right of the -/+ symbols. The action must be of type _set notes_ or _set amount_ before the Template toggle button appears.

     ![Rule Action Template mode not available](/img/multi-currency/rule-action.webp)

     ![Rule Action Normal Mode](/img/multi-currency/rule-action-normal-instructions.webp)

     ![Rule Action Template Mode](/img/multi-currency/rule-action-template.webp)
     - _set notes_ with this content: **`{{ fixed (div amount 100) 2 }}` XXX (FX rate: FX_RATE) • `{{ notes }}`**, where XXX is the currency code.
       - FX_RATE is the exchange rate (i.e., insert 0.65 for 1 AUD = 0.65 USD).
     - Click the + symbol to add a new action line.
     - Click the Template toggle button for this line.
     - _set amount_ to: **`{{ fixed (mul amount FX_RATE) 0 }}`**.
       - FX_RATE is the same as above.

   - Click on the _Save_ button.

   **Rule 2:**

   ![Rule 2](/img/multi-currency/rule-2.webp)
   - From the Rules page, click on the _Create new rule_ button in the bottom right.
   - In the Rule Modal edit popup.
   - In _Stage of rule_ select **Post**.
   - _Conditions_ must be set to **if `All` of these conditions match**.
     - `Account` **is**, and select the foreign currency account.
     - `notes` **is** set to _nothing_.
   - Under _Then apply these actions:_
     - Click the Template toggle button on the left side of the action, just to the right of the -/+ symbols.
     - _set notes_ with this content: **`{{ fixed (div amount 100) 2 }}` XXX (FX rate: FX_RATE)**, where XXX is the same currency code from the first rule.
       - FX_RATE is the exchange rate from the first rule.
     - Click the + symbol to add a new action line.
     - Click the Template toggle button for this line.
     - _set amount_ to: **`{{ fixed (mul amount FX_RATE) 0 }}`**.
       - FX_RATE is the same as above.
   - Click on the _Save_ button.

## Usage

1. Create a transaction in the foreign currency account using the foreign currency amount. (i.e., if the normal budget currency is USD but the account is AUD, then enter the AUD amount in the Payment or Deposit column).

   ![Pre-Conversion Transaction](/img/multi-currency/usage-preconvert.webp)

2. Go to the Rules page and select one of the two rules for that account. At the bottom will be transactions to which the rule can be applied.
   - If you do not see the transaction(s) that you want to convert, click cancel and check the other rule for that account.
   - Select the transaction(s) that you would like to convert and click the _Apply actions_ button.
   - Once the actions have been applied, click cancel since you don't want to change the rule.

![Apply Exchange Rate to Transaction](/img/multi-currency/usage-convert.webp)

3. Return to the foreign currency account to verify that the transaction was converted.

   ![Post-Conversion Transaction](/img/multi-currency/usage-postconvert.webp)
