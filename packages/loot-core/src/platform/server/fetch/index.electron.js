let fs = require('fs');

let fetch = require('node-fetch');

async function fetchBinary(url, filepath) {
  const res = await fetch(url);
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(filepath);
    res.body.pipe(fileStream);
    res.body.on('error', err => {
      reject(err);
    });
    fileStream.on('finish', function () {
      resolve();
    });
  });
}

module.exports = { fetch, fetchBinary };
