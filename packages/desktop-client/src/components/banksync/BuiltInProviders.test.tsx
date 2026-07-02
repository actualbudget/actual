import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BuiltInProviders } from './BuiltInProviders';
import type { BuiltInBankSyncProviderState } from './useBuiltInBankSyncProviders';

const simpleFinProvider: BuiltInBankSyncProviderState = {
  id: 'simpleFin',
  displayName: 'SimpleFIN',
  description: 'North American bank sync',
  isConfigured: true,
  canConfigure: true,
  linkError:
    'SimpleFIN rate limit exceeded. Please wait a few minutes and try again.',
  onConfigure: () => {},
  onLink: () => {},
  onReset: () => {},
};

describe('BuiltInProviders', () => {
  it('shows a warning instead of reopening setup when SimpleFIN is rate limited', () => {
    render(
      <BuiltInProviders
        providers={[simpleFinProvider]}
        syncServerStatus="online"
        showPermissionWarning={false}
        providersNeedingConfiguration={[]}
      />,
    );

    expect(
      screen.getByText(
        'SimpleFIN rate limit exceeded. Please wait a few minutes and try again.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Set up' })).toBeNull();
  });
});
