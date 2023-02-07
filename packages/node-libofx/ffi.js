function create(libofx) {
  return {
    init: libofx.cwrap('init', null, ['number']),
    debug: libofx.cwrap('debug', null, []),
    get_new_context: libofx.cwrap('get_new_context', 'number', []),
    parse_data: libofx.cwrap('parse_data', null, ['number', 'array']),

    ofx_set_transaction_cb: libofx.cwrap('ofx_set_transaction_cb', null, [
      'number',
      'number',
      'number'
    ]),

    transaction_amount: libofx.cwrap('transaction_amount', 'number', [
      'number'
    ]),
    transaction_fi_id: libofx.cwrap('transaction_fi_id', 'string', ['number']),
    transaction_date: libofx.cwrap('transaction_date', 'number', ['number']),
    transaction_payee: libofx.cwrap('transaction_payee', 'string', ['number']),
    transaction_name: libofx.cwrap('transaction_name', 'string', ['number']),
    transaction_memo: libofx.cwrap('transaction_memo', 'string', ['number']),

    set_ofx_version: libofx.cwrap('set_ofx_version', null, [
      'number',
      'string'
    ]),
    set_app_id: libofx.cwrap('set_app_id', null, ['number', 'string']),
    set_app_version: libofx.cwrap('set_app_version', null, ['number', 'string'])
  };
}

module.exports = create;
