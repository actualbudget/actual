const fs = require('fs');
const path = require('path');

const dictionary = {};
const localePath = `${process.env.PWD}/src/locales`;
let allKeys = [];
const getKeysRecursive = (arr, prefix = '') => {
  if (typeof arr !== 'object') {
    return null;
  }
  const keys = Object.keys(arr);
  const values = keys
    .map(key => {
      return getKeysRecursive(arr[key], key);
    })
    .filter(key => key !== null)
    .flat();
  return keys
    .map(key => {
      return prefix !== '' ? prefix + '.' + key : key;
    })
    .concat(values);
};
const files = fs.readdirSync(localePath);
files.forEach(file => {
  if (path.extname(file) !== '.json') {
    return;
  }

  const localeName = path.basename(file, '.json');
  const fileContent = fs.readFileSync(localePath + path.sep + file);
  const keyRecusive = getKeysRecursive(JSON.parse(fileContent.toString()));
  dictionary[localeName] = {
    keys: keyRecusive
  };
  allKeys = allKeys.concat(keyRecusive);
});
allKeys = [...new Set(allKeys)];
const locales = Object.keys(dictionary);
locales.map(locale => {
  allKeys.map(key => {
    if (dictionary[locale]['keys'].indexOf(key) < 0) {
      console.error('Undefined key %s for language %s', key, locale)
    }
  });
})
