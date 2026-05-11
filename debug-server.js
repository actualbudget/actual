#!/usr/bin/env node

const http = require('http');

const logs = [];

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/log') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, ...data };
        logs.push(logEntry);

        console.log('\n' + '='.repeat(80));
        console.log(`[${timestamp}] ${data.event}`);
        console.log('='.repeat(80));
        console.log(JSON.stringify(data.data, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        console.error('Error parsing log:', e);
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/logs') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(logs, null, 2));
  } else if (req.method === 'POST' && req.url === '/clear') {
    logs.length = 0;
    console.log('\n✓ Logs cleared\n');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Logs cleared' }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = 9999;
server.listen(PORT, () => {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 DEBUG SERVER RUNNING');
  console.log('='.repeat(80));
  console.log(`Listening on http://localhost:${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  POST /log    - Log data`);
  console.log(`  GET  /logs   - Get all logs`);
  console.log(`  POST /clear  - Clear logs`);
  console.log('='.repeat(80) + '\n');
  console.log('Waiting for events...\n');
});
