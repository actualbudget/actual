let fs = require('fs');
let fetch = require('node-fetch');

export { fetch };

export async function fetchBinary(url, filepath) {
  const res = await fetch(url);
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(filepath);
    res.body.pipe(fileStream);
    res.body.on('error', err => {
      reject(err);
    });
    fileStream.on('finish', function() {
      resolve();
    });
  });
}

