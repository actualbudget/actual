import express from 'express';
import rateLimit from 'express-rate-limit';

const app = express();

app.use(express.json());
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 25,
    legacyHeaders: false,
    standardHeaders: true,
  }),
);

app.use('/', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        host: new URL(targetUrl).host,
      },
      body: ['GET', 'HEAD'].includes(req.method)
        ? undefined
        : JSON.stringify(req.body),
    });

    const contentType =
      response.headers.get('content-type') || 'application/octet-stream';

    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', contentType);
    res.status(response.status);

    // ✅ Stream binary data correctly
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer)); // 👈 send as raw binary
  } catch (err) {
    res
      .status(500)
      .json({ error: 'Error proxying request', details: err.message });
  }
});

export { app as handlers };
