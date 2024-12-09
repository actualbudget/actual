import getAccountDb from '../src/account-db.js';

export const up = async function () {
  await getAccountDb().exec(
    `UPDATE secrets SET name = 'gocardless_secretId' WHERE name = 'nordigen_secretId'`,
  );
  await getAccountDb().exec(
    `UPDATE secrets SET name = 'gocardless_secretKey' WHERE name = 'nordigen_secretKey'`,
  );
};

export const down = async function () {
  await getAccountDb().exec(
    `UPDATE secrets SET name = 'nordigen_secretId' WHERE name = 'gocardless_secretId'`,
  );
  await getAccountDb().exec(
    `UPDATE secrets SET name = 'nordigen_secretKey' WHERE name = 'gocardless_secretKey'`,
  );
};
