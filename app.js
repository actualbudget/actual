const fs = require('fs');
const express = require('express');
const actuator = require('express-actuator');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./load-config');

const accountApp = require('./app-account');
const syncApp = require('./app-sync');

const app = express();

process.on('unhandledRejection', reason => {
  console.log('Rejection:', reason);
});

app.use(cors());
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.raw({ type: 'application/actual-sync', limit: '20mb' }));
app.use(bodyParser.raw({ type: 'application/encrypted-file', limit: '50mb' }));

app.use('/sync', syncApp.handlers);
app.use('/account', accountApp.handlers);

app.get('/mode', (req, res) => {
  res.send(config.mode);
});

app.use(actuator()); // Provides /health, /metrics, /info

// The web frontend
app.use(express.static(__dirname + '/node_modules/@actual-app/web/build'));
app.get('/*', (req, res) => {
  res.sendFile(__dirname + '/node_modules/@actual-app/web/build/index.html');
});

async function run() {
  if (!fs.existsSync(config.serverFiles)) {
    fs.mkdirSync(config.serverFiles);
  }

  if (!fs.existsSync(config.userFiles)) {
    fs.mkdirSync(config.userFiles);
  }

  await accountApp.init();
  await syncApp.init();

  console.log('Listening on ' + config.hostname + ':' + config.port + '...');
  app.listen(config.port, config.hostname);
}

run().catch(err => {
  console.log('Error starting app:', err);
  process.exit(1);
});
