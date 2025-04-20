import { render, screen, fireEvent } from '@testing-library/react';
import { type Mock } from 'vitest';

import { useLocalPref } from '../../hooks/useLocalPref';
import { useSyncedPref } from '../../hooks/useSyncedPref';

import { ExperimentalFeatures } from './Experimental';

vi.mock('../../hooks/useLocalPref');
vi.mock('../../hooks/useSyncedPref');

const mockUseLocalPref = useLocalPref as Mock;
const mockUseSyncedPref = useSyncedPref as Mock;

describe('ExperimentalFeatures', () => {
  beforeEach(() => {
    mockUseLocalPref.mockReturnValue([false, vi.fn()]);
    mockUseSyncedPref.mockReturnValue([false, vi.fn()]);
  });

  it('should allow the user to toggle the push notifications preference', () => {
    const setNotificationsEnabled = vi.fn();
    mockUseLocalPref.mockReturnValue([false, setNotificationsEnabled]);

    render(<ExperimentalFeatures />);
    const showFeaturesLink = screen.getByText(
      'I understand the risks, show experimental features',
    );
    fireEvent.click(showFeaturesLink);
    const checkbox = screen.getByLabelText(
      'Push Notifications for Uncategorized Transactions',
    );
    fireEvent.click(checkbox);
    expect(setNotificationsEnabled).toHaveBeenCalledWith(true);
  });
});
