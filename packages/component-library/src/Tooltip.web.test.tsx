import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { Button } from './Button';
import { Tooltip } from './Tooltip';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('Tooltip', () => {
  it.each(['opening', 'closing'])(
    'cancels a pending %s delay when unmounted',
    pending => {
      const { unmount } = render(
        <Tooltip
          content="Details"
          triggerProps={{ delay: 300, closeDelay: 300 }}
        >
          <Button>Trigger</Button>
        </Tooltip>,
      );
      const trigger = screen.getByRole('button', { name: 'Trigger' });
      fireEvent.mouseEnter(trigger);
      if (pending === 'closing') {
        fireEvent.mouseLeave(trigger);
      }
      expect(vi.getTimerCount()).toBeGreaterThan(0);

      unmount();

      expect(vi.getTimerCount()).toBe(0);
    },
  );
});
