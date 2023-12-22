# Integration new bank

Find in [doc](https://docs.google.com/spreadsheets/d/1ogpzydzotOltbssrc3IQ8rhBLlIZbQgm5QCiiNJrkyA/edit#gid=489769432) what is id of bank which you want to integrate

Launch frontend and backend server

Create new linked account selecting the institution which you are interested in.

In the server logs you can find all required information to create class for
your bank.

Create new a bank class based on `app-gocardless/banks/sandboxfinance-sfin0000.js`. Name of the file and class should be
created based on the ID of the integrated institution.

Fill the logic of `normalizeAccount`, `normalizeTransaction`, `sortTransactions`, and `calculateStartingBalance` functions.
You should do it based on the data which you found in the logs.

Example logs which help you to fill:

- `normalizeAccount` function:

```log
Available account properties for new institution integration {
  account: '{"iban":"PL00000000000000000987654321","currency":"PLN","ownerName":"John Example","displayName":"Product name","product":"Daily account","usage":"PRIV","ownerAddressUnstructured":["POL","UL. Example 1","00-000 Warsaw"],"id":"XXXXXXXX-XXXX-XXXXX-XXXXXX-XXXXXXXXX","created":"2023-01-18T12:15:16.502446Z","last_accessed":null,"institution_id":"MBANK_RETAIL_BREXPLPW","status":"READY","owner_name":"","institution":{"id":"MBANK_RETAIL_BREXPLPW","name":"mBank Retail","bic":"BREXPLPW","transaction_total_days":"90","countries":["PL"],"logo":"https://cdn.nordigen.com/ais/MBANK_RETAIL_BREXCZPP.png","supported_payments":{},"supported_features":["access_scopes","business_accounts","card_accounts","corporate_accounts","pending_transactions","private_accounts"]}}'
}
```

- `sortTransactions` function:

```log
Available (first 10) transactions properties for new integration of institution in sortTransactions function {
  top10SortedTransactions: '[{"transactionId":"20220101001","bookingDate":"2022-01-01","valueDate":"2022-01-01","transactionAmount":{"amount":"5.01","currency":"EUR"},"creditorName":"JOHN EXAMPLE","creditorAccount":{"iban":"PL00000000000000000987654321"},"debtorName":"CHRIS EXAMPLE","debtorAccount":{"iban":"PL12345000000000000987654321"},"remittanceInformationUnstructured":"TEST BANK TRANSFER","remittanceInformationUnstructuredArray":["TEST BANK TRANSFER"],"balanceAfterTransaction":{"balanceAmount":{"amount":"448.52","currency":"EUR"},"balanceType":"interimBooked"},"internalTransactionId":"casfib7720c2a02c0331cw2"}]'
}
```

- `calculateStartingBalance` function:

```log
Available (first 10) transactions properties for new integration of institution in calculateStartingBalance function {
  balances: '[{"balanceAmount":{"amount":"448.52","currency":"EUR"},"balanceType":"forwardAvailable"},{"balanceAmount":{"amount":"448.52","currency":"EUR"},"balanceType":"interimBooked"}]',
    top10SortedTransactions: '[{"transactionId":"20220101001","bookingDate":"2022-01-01","valueDate":"2022-01-01","transactionAmount":{"amount":"5.01","currency":"EUR"},"creditorName":"JOHN EXAMPLE","creditorAccount":{"iban":"PL00000000000000000987654321"},"debtorName":"CHRIS EXAMPLE","debtorAccount":{"iban":"PL12345000000000000987654321"},"remittanceInformationUnstructured":"TEST BANK TRANSFER","remittanceInformationUnstructuredArray":["TEST BANK TRANSFER"],"balanceAfterTransaction":{"balanceAmount":{"amount":"448.52","currency":"EUR"},"balanceType":"interimBooked"},"internalTransactionId":"casfib7720c2a02c0331cw2"}]'
}
```

Add new bank integration to `BankFactory` class in file `actual-server/app-gocardless/bank-factory.js`

Remember to add tests for new bank integration in
