import * as fs from 'fs';

import fetch from 'node-fetch';

export { fetch };

export let fetchBinary = async function (url, filepath) {
  let res = await fetch(url);
  return new Promise((resolve, reject) => {
    let fileStream = fs.createWriteStream(filepath);
    res.body.pipe(fileStream);
    res.body.on('error', err => {
      reject(err);
    });
    fileStream.on('finish', function () {
      resolve(undefined);
    });
  });
};
