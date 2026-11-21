import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createTestAppStore, TestProviders } from '#mocks';
import {
  addNotification,
  setNotificationInset,
} from '#notifications/notificationsSlice';

import { Notifications } from './Notifications';

describe('Notifications', () => {
  it('includes safe-area-inset-bottom in the default bottom offset', () => {
    const store = createTestAppStore();
    store.dispatch(
      addNotification({
        notification: { id: 'test-1', message: 'Saved' },
      }),
    );

    const { container } = render(
      <TestProviders store={store}>
        <Notifications />
      </TestProviders>,
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveStyle({
      bottom: 'calc(20px + env(safe-area-inset-bottom))',
    });
  });

  it('combines custom bottom inset with safe-area-inset-bottom', () => {
    const store = createTestAppStore();
    store.dispatch(setNotificationInset({ inset: { bottom: 100 } }));
    store.dispatch(
      addNotification({
        notification: { id: 'test-2', message: 'Budget updated' },
      }),
    );

    const { container } = render(
      <TestProviders store={store}>
        <Notifications />
      </TestProviders>,
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveStyle({
      bottom: 'calc(100px + env(safe-area-inset-bottom))',
    });
  });
});
