import createFFI from './ffi';
import libofxWrapper from './libofx';

let _libofxPromise;
let _libofx;
let ffi;

var parser = {
  ctx: null,
  transactions: [],

  reset: function () {
    // TODO: free all C objects
    parser.transactions = [];
  },

  onTransaction: function (trans) {
    parser.transactions.push({
      amount: ffi.transaction_amount(trans),
      fi_id: ffi.transaction_fi_id(trans),
      date: ffi.transaction_date(trans),
      payee: ffi.transaction_payee(trans),
      name: ffi.transaction_name(trans),
      memo: ffi.transaction_memo(trans),
    });
  },
};

export async function initModule() {
  if (!_libofxPromise) {
    _libofxPromise = new Promise(resolve => {
      libofxWrapper({
        locateFile(path) {
          if (path.endsWith('.wasm')) {
            if (process.env.PUBLIC_URL) {
              return process.env.PUBLIC_URL + path;
            }
            return __dirname + '/' + path;
          }
        },
      }).then(libofx => {
        ffi = createFFI(libofx);

        parser.ctx = ffi.get_new_context();
        ffi.init();
        ffi.debug();

        ffi.ofx_set_transaction_cb(
          parser.ctx,
          libofx.addFunction(parser.onTransaction, 'vi'),
        );
        _libofx = libofx;

        resolve();
      });
    });
  }

  await _libofxPromise;
}

export function getOFXTransactions(data) {
  ffi.parse_data(parser.ctx, data);
  let transactions = parser.transactions;
  parser.reset();
  return transactions;
}
