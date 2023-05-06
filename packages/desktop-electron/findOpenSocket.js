const { getRandomPort } = require('get-port-please');

async function findOpenSocket() {
  return getRandomPort();
}

module.exports = findOpenSocket;
