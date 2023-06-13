export function getAmount(amount) {
  let list = ['amount'];
  return list.indexOf(amount.slice(0, 6)) > -1;
}

export function strConds(field) {
  let list = ['imported_payee', 'notes'];
  return list.indexOf(field) > -1;
}

export function getDate(date) {
  let list = ['date'];
  return list.indexOf(date) > -1;
}
