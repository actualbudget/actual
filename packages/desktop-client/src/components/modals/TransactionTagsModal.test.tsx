import { HotkeysProvider } from 'react-hotkeys-hook';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { TagEntity } from '@actual-app/core/types/models';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { tagQueries } from '#tags/queries';

import { TransactionTagsModal } from './TransactionTagsModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const existingTags: TagEntity[] = [
  { id: 'tag1', tag: 'vacation' },
  { id: 'tag2', tag: 'taxes' },
];

function renderModal({
  onSubmit = vi.fn(),
  tags = existingTags,
  createTag = vi.fn(async (tag: Omit<TagEntity, 'id'>) => ({
    id: `created-${tag.tag}`,
    ...tag,
  })),
}: {
  onSubmit?: (action: 'add' | 'remove' | 'remove-all', tags?: string[]) => void;
  tags?: TagEntity[];
  createTag?: (tag: Omit<TagEntity, 'id'>) => Promise<TagEntity>;
} = {}) {
  const queryClient = createTestQueryClient();
  const store = configureTestAppStore({ queryClient });
  queryClient.setQueryData(tagQueries.list().queryKey, tags);

  initServer({
    'tags-create': createTag,
  });

  render(
    <HotkeysProvider initiallyActiveScopes={['app']}>
      <TestProviders queryClient={queryClient} store={store}>
        <TransactionTagsModal onSubmit={onSubmit} />
      </TestProviders>
    </HotkeysProvider>,
  );

  return { createTag, onSubmit, store };
}

afterEach(() => {
  global.__resetWorld();
});

describe('TransactionTagsModal', () => {
  it('creates typed custom tags when adding them to transactions', async () => {
    const user = userEvent.setup();
    const { createTag, onSubmit } = renderModal();

    await user.click(screen.getByRole('button', { name: '#vacation' }));
    await user.type(screen.getByPlaceholderText('Tag'), 'custom{Enter}');
    await user.click(screen.getByRole('button', { name: 'Add tags' }));

    await waitFor(() => {
      expect(createTag).toHaveBeenCalledTimes(1);
    });
    expect(createTag).toHaveBeenCalledWith({ tag: 'custom' });
    expect(onSubmit).toHaveBeenCalledWith('add', ['vacation', 'custom']);
  });

  it('surfaces tag creation failures without submitting changes', async () => {
    const user = userEvent.setup();
    const unhandledRejections: unknown[] = [];
    const trackUnhandledRejection = (event: PromiseRejectionEvent) => {
      unhandledRejections.push(event.reason);
    };
    const createTag = vi.fn(async () => {
      throw new Error('network unavailable');
    });
    const { onSubmit, store } = renderModal({ createTag });

    window.addEventListener('unhandledrejection', trackUnhandledRejection);
    try {
      await user.type(screen.getByPlaceholderText('Tag'), 'custom{Enter}');
      await user.click(screen.getByRole('button', { name: 'Add tags' }));

      await waitFor(() => {
        expect(createTag).toHaveBeenCalledTimes(1);
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(unhandledRejections).toHaveLength(0);
      expect(onSubmit).not.toHaveBeenCalled();
      expect(store.getState().notifications.notifications).toEqual([
        expect.objectContaining({
          type: 'error',
          message: 'There was an error creating the tag. Please try again.',
          pre: 'network unavailable',
        }),
      ]);
    } finally {
      window.removeEventListener('unhandledrejection', trackUnhandledRejection);
    }
  });
});
