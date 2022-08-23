const uuid = require('../platform/uuid');

export function generateAccount(balance) {
  return {
    account_id: uuid.v4Sync(),
    balances: {
      available: balance,
      current: balance,
      limit: null
    },
    mask: '0000',
    name: 'Plaid Checking',
    official_name: 'Plaid Interest Checking',
    subtype: 'checking',
    type: 'depository'
  };
}

export function generateTransaction(
  acctId,
  amount,
  name,
  date,
  pending = false
) {
  return {
    account_id: acctId,
    account_owner: null,
    amount,
    category: [],
    category_id: '',
    date,
    location: {
      address: null,
      city: null,
      lat: null,
      lon: null,
      state: null,
      store_number: null,
      zip: null
    },
    name,
    payment_meta: {
      by_order_of: null,
      payee: null,
      payer: null,
      payment_method: null,
      payment_processor: null,
      ppd_id: null,
      reason: null,
      reference_number: null
    },
    pending: pending,
    pending_transaction_id: null,
    transaction_id: uuid.v4Sync(),
    transaction_type: 'special'
  };
}
