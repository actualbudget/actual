import { config } from '../load-config';

const protocol =
  config.get('https.key') && config.get('https.cert') ? 'https' : 'http';
const hostname =
  config.get('hostname') === '::' ? 'localhost' : config.get('hostname');

fetch(`${protocol}://${hostname}:${config.get('port')}/health`)
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
