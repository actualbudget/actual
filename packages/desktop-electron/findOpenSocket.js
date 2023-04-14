const ipc = require('node-ipc');

ipc.config.silent = true;

function isSocketTaken(name, fn) {
  return new Promise((resolve, reject) => {
    ipc.connectTo(name, () => {
      ipc.of[name].on('error', () => {
        ipc.disconnect(name);
        resolve(false);
      });

      ipc.of[name].on('connect', () => {
        console.log('connected');
        ipc.disconnect(name);
        resolve(true);
      });
    });
  });
}

async function findOpenSocket() {
  let currentSocket = 1;
  while (await isSocketTaken('actual' + currentSocket)) {
    currentSocket++;
    console.log('checking', currentSocket);
  }
  let socketName = 'actual' + currentSocket;
  console.log(`Listening... (${socketName})`);
  return socketName;
}

module.exports = findOpenSocket;
