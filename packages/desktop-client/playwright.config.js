module.exports = {
  timeout: 60000,
  retries: 1,
  use: {
    browserName: 'chromium',
    baseURL: process.env.E2E_START_URL ?? 'http://localhost:3001'
  }
};
