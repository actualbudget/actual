module.exports = {
  timeout: 10000, // 10 seconds
  retries: 1,
  use: {
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    browserName: 'chromium',
    baseURL: process.env.E2E_START_URL ?? 'http://localhost:3001'
  }
};
