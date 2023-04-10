import * as fs from 'fs';

import fetch from 'node-fetch';

export { fetch };

export const fetchBinary = async function (url, filepath) {
  const res = await fetch(url);
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(filepath);
    res.body.pipe(fileStream);
    res.body.on('error', err => {
      reject(err);
    });
    fileStream.on('finish', function () {
      resolve(undefined);
    });
  });
};
