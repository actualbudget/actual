# Multi-Currency

The Actual Budget software is currency agnostic and does not support multi-currency. People are working on implementing currency support, but it will take time.
For the current status visit:
https://github.com/tlesicka/actual-budget-multicurrency-todo

## Method to Implement Multi-Currency Using Rule Templates

Until multi-currency is supported natively by Actual Budget, you can use the method described in this document to achieve similar results.

<ExperimentalFeatureWarning issueId="3606" />

## Setup

1. Enable Rule Action Templating
   - In the sidebar, click on the _Settings->Show advanced settings->Experimental features_.
   - Click _I understand the risks, show experimental features_.
   - Click _Rule action templating_.

2. Create Foreign Currency Account
   - As an optional step, you can create a new account for the foreign currency, either:
     - Add a note to the account `#currency:XXX` where XXX is the 3-letter currency code as defined by [ISO 4217](https://en.wikipedia.org/wiki/ISO_4217) (i.e., EUR, USD, AUD, etc).
     - Name the account with the currency code in parens (i.e., `Australian Cash (AUD)`).

     <img width="423" alt="The Australian Cash (AUD) account header, with the #currency:AUD note shown" src="/img/budgeting/multi-currency-account-name-and-note@2x.webp" />

     Neither is required, but naming the account this way or creating a note will allow a smooth transition when multi-currency is enabled.

3. Create Rules

   You will need to create two separate rules for each foreign currency account.

   **Rule 1:**

   <img width="920" alt="Rule 1 for the AUD account, with templated set notes and set amount actions" src="/img/budgeting/multi-currency-rule-1@2x.webp" />
   - From the Rules page, click on the _Create new rule_ button in the bottom right.
   - In the Rule Modal edit popup.
   - In _Stage of rule_ select **Post**.
   - _Conditions_ must be set to **if `All` of these conditions match**.
     - `Account` **is**, and select the foreign currency account.
     - `notes` **is not** set to _nothing_.
     - `notes` **does not contain** _FX rate:_
   - Under _Then apply these actions:_
     - Click the Template toggle button on the left side of the action, just to the right of the -/+ symbols. The action must be of type _set notes_ or _set amount_ before the Template toggle button appears.

     <img width="876" alt="A set category action, which has no template toggle" src="/img/budgeting/multi-currency-rule-action@2x.webp" />

     <img width="876" alt="A set notes action in normal mode, with the template toggle boxed" src="/img/budgeting/multi-currency-rule-action-normal@2x.webp" />

     <img width="876" alt="A set notes action in template mode, with the handlebars expression" src="/img/budgeting/multi-currency-rule-action-template@2x.webp" />
   - _set notes_ with this content: **`{{ fixed (div amount 100) 2 }}` XXX (FX rate: FX_RATE) • `{{ notes }}`**, where XXX is the currency code.
     - FX_RATE is the exchange rate (i.e., insert 0.65 for 1 AUD = 0.65 USD).
   - Click the + symbol to add a new action line.
   - Click the Template toggle button for this line.
   - _set amount_ to: **`{{ fixed (mul amount FX_RATE) 0 }}`**.
     - FX_RATE is the same as above.
   - Click on the _Save_ button.

   **Rule 2:**

   <img width="920" alt="Rule 2 for the AUD account, for transactions without notes" src="/img/budgeting/multi-currency-rule-2@2x.webp" />
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

   <img width="1200" alt="The AUD account with a 52.43 transaction entered in Australian dollars" src="/img/budgeting/multi-currency-usage-preconvert@2x.webp" />

2. Go to the Rules page and select one of the two rules for that account. At the bottom will be transactions to which the rule can be applied.
   - If you do not see the transaction(s) that you want to convert, click cancel and check the other rule for that account.
   - Select the transaction(s) that you would like to convert and click the _Apply actions_ button.
   - Once the actions have been applied, click cancel since you don't want to change the rule.

<img width="920" alt="Rule 1 with the matching transaction ticked and the Apply actions button, numbered in order" src="/img/budgeting/multi-currency-usage-convert@2x.webp" />

3. Return to the foreign currency account to verify that the transaction was converted.

   <img width="1200" alt="The same transaction converted to 34.08, with the original amount and rate in its notes" src="/img/budgeting/multi-currency-usage-postconvert@2x.webp" />
