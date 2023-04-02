let fs = require('fs');

const _fetch = require('node-fetch');

async function _fetchBinary(url, filepath) {
  const res = await _fetch(url);
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
}

module.exports = { fetch: _fetch, fetchBinary: _fetchBinary };
