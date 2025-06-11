import express from 'express';
import rateLimit from 'express-rate-limit';
import { config } from './load-config.js';

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

// Cache for the whitelist to avoid fetching it on every request
let whitelistedRepos = [];
let lastWhitelistFetch = 0;
const WHITELIST_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchWhitelist() {
  const now = Date.now();
  if (now - lastWhitelistFetch < WHITELIST_CACHE_TTL && whitelistedRepos.length > 0) {
    return whitelistedRepos;
  }

  try {
    const response = await fetch('https://raw.githubusercontent.com/actual-plugins/whitelist/refs/heads/main/plugins.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch whitelist: ${response.status}`);
    }
    const plugins = await response.json();
    whitelistedRepos = plugins.map(plugin => plugin.url);
    lastWhitelistFetch = now;
    console.log('Updated plugin whitelist:', whitelistedRepos);
    return whitelistedRepos;
  } catch (error) {
    console.error('Failed to fetch plugin whitelist:', error);
    // Return empty array if fetch fails to be safe
    return [];
  }
}

function isUrlAllowed(targetUrl) {
  try {
    const url = new URL(targetUrl);
    
    // Always allow localhost
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return true;
    }

    // Always allow the whitelist URL itself
    if (targetUrl === 'https://raw.githubusercontent.com/actual-plugins/whitelist/refs/heads/main/plugins.json') {
      return true;
    }

    // Check against whitelisted repositories
    for (const repoUrl of whitelistedRepos) {
      try {
        const repoUrlObj = new URL(repoUrl);
        const repoOwner = repoUrlObj.pathname.split('/')[1];
        const repoName = repoUrlObj.pathname.split('/')[2];
        
        // Allow the repository URL itself
        if (targetUrl === repoUrl || targetUrl.startsWith(repoUrl + '/')) {
          return true;
        }
        
        // Allow GitHub API calls for this repository
        if (url.hostname === 'api.github.com' && 
            url.pathname.startsWith(`/repos/${repoOwner}/${repoName}`)) {
          return true;
        }
        
        // Allow raw.githubusercontent.com for this repository
        if (url.hostname === 'raw.githubusercontent.com' && 
            url.pathname.startsWith(`/${repoOwner}/${repoName}/`)) {
          return true;
        }
        
        // Allow github.com releases for this repository
        if (url.hostname === 'github.com' && 
            url.pathname.startsWith(`/${repoOwner}/${repoName}/releases/`)) {
          return true;
        }
      } catch (e) {
        console.warn('Invalid repository URL in whitelist:', repoUrl, e.message);
        continue;
      }
    }
    
    return false;
  } catch (e) {
    console.warn('Invalid target URL:', targetUrl, e.message);
    return false;
  }
}

app.use('/', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Fetch the latest whitelist
  await fetchWhitelist();

  // Check if the URL is allowed
  if (!isUrlAllowed(targetUrl)) {
    console.warn('Blocked request to unauthorized URL:', targetUrl);
    return res.status(403).json({ 
      error: 'URL not allowed', 
      message: 'Only localhost and whitelisted plugin repositories are allowed' 
    });
  }

  try {
    const url = new URL(targetUrl);
    const requestHeaders = {
      ...req.headers,
      host: url.host,
    };

    // Add GitHub authentication if token is configured and request is to GitHub
    const githubToken = config.get('github.token');
    if (githubToken && (
      url.hostname === 'api.github.com' ||
      url.hostname === 'raw.githubusercontent.com' ||
      (url.hostname === 'github.com' && url.pathname.includes('/releases/'))
    )) {
      requestHeaders['Authorization'] = `Bearer ${githubToken}`;
      requestHeaders['User-Agent'] = 'Actual-Budget-Plugin-System';
      console.log(`Using GitHub authentication for request to: ${url.hostname}`);
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: requestHeaders,
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
