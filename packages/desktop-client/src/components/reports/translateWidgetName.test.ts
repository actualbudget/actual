import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_DASHBOARD_TIPS_MARKDOWN,
  isDefaultDashboardName,
  translateDashboardMarkdownContent,
  translateWidgetName,
} from './translateWidgetName';

describe('translateWidgetName', () => {
  const t = vi.fn((key: string) => `ZH:${key}`);

  it('returns fallback when name is empty', () => {
    expect(translateWidgetName(null, t as never, 'fallback')).toBe('fallback');
    expect(translateWidgetName(undefined, t as never, 'fallback')).toBe(
      'fallback',
    );
    expect(translateWidgetName('', t as never, 'fallback')).toBe('fallback');
    expect(t).not.toHaveBeenCalled();
  });

  it('translates known default dashboard widget names', () => {
    expect(
      translateWidgetName('Total Income (YTD)', t as never, 'Summary'),
    ).toBe('ZH:Total Income (YTD)');
    expect(translateWidgetName('Budget Overview', t as never, 'x')).toBe(
      'ZH:Budget Overview',
    );
    expect(translateWidgetName('Main', t as never, 'x')).toBe('ZH:Main');
  });

  it('leaves custom user names unchanged', () => {
    expect(translateWidgetName('我的报表', t as never, 'x')).toBe('我的报表');
    expect(translateWidgetName('Q3 Review', t as never, 'x')).toBe('Q3 Review');
  });
});

describe('isDefaultDashboardName', () => {
  it('recognizes defaults only', () => {
    expect(isDefaultDashboardName('Transaction Calendar')).toBe(true);
    expect(isDefaultDashboardName('Custom')).toBe(false);
  });
});

describe('translateDashboardMarkdownContent', () => {
  const t = vi.fn((key: string) => `ZH:${key.slice(0, 20)}`);

  it('translates the default Dashboard Tips seed', () => {
    expect(
      translateDashboardMarkdownContent(DEFAULT_DASHBOARD_TIPS_MARKDOWN, t as never),
    ).toBe(`ZH:${DEFAULT_DASHBOARD_TIPS_MARKDOWN.slice(0, 20)}`);
    expect(t).toHaveBeenCalledWith(DEFAULT_DASHBOARD_TIPS_MARKDOWN);
  });

  it('leaves custom markdown unchanged', () => {
    expect(
      translateDashboardMarkdownContent('## 自定义', t as never),
    ).toBe('## 自定义');
  });

  it('handles empty content', () => {
    expect(translateDashboardMarkdownContent(null, t as never)).toBe('');
    expect(translateDashboardMarkdownContent(undefined, t as never)).toBe('');
  });
});
