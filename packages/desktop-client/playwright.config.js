module.exports = {
  timeout: 20000, // 20 seconds
  retries: 1,
  use: {
    screenshot: 'on',
    browserName: 'chromium',
    baseURL: process.env.E2E_START_URL ?? 'http://localhost:3001'
  }
};
