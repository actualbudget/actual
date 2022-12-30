import { test as base, expect } from '@playwright/test';

const test = base.extend({
  url: process.env.E2E_START_URL ?? 'http://localhost:3001'
});

const { describe, beforeEach } = test;

describe('App', () => {
  beforeEach(async ({ page, url }) => {
    await page.goto(url);
  });

  test('Correct Page Title', async ({ page }) => {
    const title = await page.title();

    expect(title).toBe('Actual');
  });
});
