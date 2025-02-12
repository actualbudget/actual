import fetch from 'node-fetch';

import { config } from '../load-config.js';

const protocol = config.https ? 'https' : 'http';
const hostname = config.hostname === '::' ? 'localhost' : config.hostname;

fetch(`${protocol}://${hostname}:${config.port}/health`)
  .then(res => res.json())
  .then(res => {
    if (res.status !== 'UP') {
      throw new Error(
        'Health check failed: Server responded to health check with status ' +
          res.status,
      );
    }
  })
  .catch(err => {
    console.log('Health check failed:', err);
    process.exit(1);
  });
