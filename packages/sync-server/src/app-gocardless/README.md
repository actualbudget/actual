# Integration new bank

If the default bank integration does not work for you, you can integrate a new bank by following these steps.

1. Find in [this google doc](https://docs.google.com/spreadsheets/d/1ogpzydzotOltbssrc3IQ8rhBLlIZbQgm5QCiiNJrkyA/edit#gid=489769432) what is the identifier of the bank which you want to integrate.

2. Launch frontend and backend server.

3. In the frontend, create a new linked account selecting the institution which you are interested in.

   This will trigger the process of fetching the data from the bank and will log the data in the backend. Use this data to fill the logic of the bank class.

4. Create new a bank class based on an existing example in `app-gocardless/banks`.

   Name of the file and class should follow the existing patterns and be created based on the ID of the integrated institution, found in step 1.

5. Fill the logic of `normalizeAccount`, `normalizeTransaction`, `sortTransactions`, and `calculateStartingBalance` functions.
   You do not need to fill every function, only those which are necessary for the integration to work.

   You should do it based on the data which you found in the logs.

   Example logs which help you to fill:

   - `normalizeAccount` function:

     ```log
     Available account properties for new institution integration {
       account: '{
         "iban": "PL00000000000000000987654321",
         "currency": "PLN",
         "ownerName": "John Example",
         "displayName": "Product name",
         "product": "Daily account",
         "usage": "PRIV",
         "ownerAddressUnstructured": [
           "POL",
           "UL. Example 1",
           "00-000 Warsaw"
         ],
         "id": "XXXXXXXX-XXXX-XXXXX-XXXXXX-XXXXXXXXX",
         "created": "2023-01-18T12:15:16.502446Z",
         "last_accessed": null,
         "institution_id": "MBANK_RETAIL_BREXPLPW",
         "status": "READY",
         "owner_name": "",
         "institution": {
           "id": "MBANK_RETAIL_BREXPLPW",
           "name": "mBank Retail",
           "bic": "BREXPLPW",
           "transaction_total_days": "90",
           "countries": [
             "PL"
           ],
           "logo": "https://cdn.nordigen.com/ais/MBANK_RETAIL_BREXCZPP.png",
           "supported_payments": {},
           "supported_features": [
             "access_scopes",
             "business_accounts",
             "card_accounts",
             "corporate_accounts",
             "pending_transactions",
             "private_accounts"
           ]
         }
       }'
     }
     ```

   - `sortTransactions` function:

     ```log
     Available (first 10) transactions properties for new integration of institution in sortTransactions function
     {
       top10SortedTransactions: '[
         {
           "transactionId": "20220101001",
           "bookingDate": "2022-01-01",
           "valueDate": "2022-01-01",
           "transactionAmount": {
             "amount": "5.01",
             "currency": "EUR"
           },
           "creditorName": "JOHN EXAMPLE",
           "creditorAccount": {
             "iban": "PL00000000000000000987654321"
           },
           "debtorName": "CHRIS EXAMPLE",
           "debtorAccount": {
             "iban": "PL12345000000000000987654321"
           },
           "remittanceInformationUnstructured": "TEST BANK TRANSFER",
           "remittanceInformationUnstructuredArray": [
             "TEST BANK TRANSFER"
           ],
           "balanceAfterTransaction": {
             "balanceAmount": {
               "amount": "448.52",
               "currency": "EUR"
             },
             "balanceType": "interimBooked"
           },
           "internalTransactionId": "casfib7720c2a02c0331cw2"
         }
       ]'
     }
     ```

   - `calculateStartingBalance` function:

     ```log
     Available (first 10) transactions properties for new integration of institution in calculateStartingBalance function {
       balances: '[
         {
           "balanceAmount": {
             "amount": "448.52",
             "currency": "EUR"
           },
           "balanceType": "forwardAvailable"
         },
         {
           "balanceAmount": {
             "amount": "448.52",
             "currency": "EUR"
           },
           "balanceType": "interimBooked"
         }
       ]',
         top10SortedTransactions: '[
         {
           "transactionId": "20220101001",
           "bookingDate": "2022-01-01",
           "valueDate": "2022-01-01",
           "transactionAmount": {
             "amount": "5.01",
             "currency": "EUR"
           },
           "creditorName": "JOHN EXAMPLE",
           "creditorAccount": {
             "iban": "PL00000000000000000987654321"
           },
           "debtorName": "CHRIS EXAMPLE",
           "debtorAccount": {
             "iban": "PL12345000000000000987654321"
           },
           "remittanceInformationUnstructured": "TEST BANK TRANSFER",
           "remittanceInformationUnstructuredArray": [
             "TEST BANK TRANSFER"
           ],
           "balanceAfterTransaction": {
             "balanceAmount": {
               "amount": "448.52",
               "currency": "EUR"
             },
             "balanceType": "interimBooked"
           },
           "internalTransactionId": "casfib7720c2a02c0331cw2"
         }
       ]'
     }
     ```

6. Add new bank integration to `BankFactory` class in file `actual-server/app-gocardless/bank-factory.js`

7. Remember to add tests for new bank integration in

## normalizeTransaction

This is the most commonly used override as it allows you to change the data that is returned to the client.

Please follow the following patterns when implementing a custom normalizeTransaction method:

1. If you need to edit the values of transaction fields (excluding the transaction amount) do not mutate the original transaction object. Instead, create a shallow copy and make your changes there.
2. End the function by returning the result of calling the fallback normalizeTransaction method from integration-bank.js

E.g.

```js
import Fallback from './integration-bank.js';

export default {
  ...

  normalizeTransaction(transaction, booked) {
    // create a shallow copy of the transaction object
    const editedTrans = { ...transaction };

    // make any changes required to the copy
    editedTrans.remittanceInformationUnstructured = transaction.remittanceInformationStructured;

    // call the fallback method, passing in your edited transaction as the 3rd parameter
    // this will calculate the date, payee name and notes fields based on your changes
    // but leave the original fields available for mapping in the UI
    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  }

  ...
}
```
