import { createApp } from './app';

const connection = require('../platform/server/connection');

// Main app
const app = createApp();

app.events.on('sync', info => {
  connection.send('sync-event', info);
});

export default app;
