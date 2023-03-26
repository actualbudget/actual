export default function parse(qif, options) {
  var lines = qif.split('\n'),
    line = lines.shift(),
    type = /!Type:([^$]*)$/.exec(line.trim()),
    data = {},
    transactions = (data.transactions = []),
    transaction = {};

  options = options || {};

  if (!type || !type.length) {
    throw new Error('File does not appear to be a valid qif file: ' + line);
  }
  data.type = type[1];

  var division = {};

  while ((line = lines.shift())) {
    line = line.trim();
    if (line === '^') {
      transactions.push(transaction);
      transaction = {};
      continue;
    }
    switch (line[0]) {
      case 'D':
        transaction.date = line.substring(1);
        break;
      case 'T':
        transaction.amount = line.substring(1);
        break;
      case 'N':
        transaction.number = line.substring(1);
        break;
      case 'M':
        transaction.memo = line.substring(1);
        break;
      case 'A':
        transaction.address = (transaction.address || []).concat(
          line.substring(1),
        );
        break;
      case 'P':
        transaction.payee = line.substring(1).replace(/&amp;/g, '&');
        break;
      case 'L':
        var lArray = line.substring(1).split(':');
        transaction.category = lArray[0];
        if (lArray[1] !== undefined) {
          transaction.subcategory = lArray[1];
        }
        break;
      case 'C':
        transaction.clearedStatus = line.substring(1);
        break;
      case 'S':
        var sArray = line.substring(1).split(':');
        division.category = sArray[0];
        if (sArray[1] !== undefined) {
          division.subcategory = sArray[1];
        }
        break;
      case 'E':
        division.description = line.substring(1);
        break;
      case '$':
        division.amount = parseFloat(line.substring(1));
        if (!(transaction.division instanceof Array)) {
          transaction.division = [];
        }
        transaction.division.push(division);
        division = {};

        break;

      default:
        throw new Error('Unknown Detail Code: ' + line[0]);
    }
  }

  if (Object.keys(transaction).length) {
    transactions.push(transaction);
  }

  data.dateFormat = options.dateFormat;
  return data;
}
