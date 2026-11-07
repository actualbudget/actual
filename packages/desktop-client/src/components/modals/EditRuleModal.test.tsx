import React from 'react';

import * as undo from '@actual-app/core/platform/client/undo';
import type { RuleEntity } from '@actual-app/core/types/models';
import { render } from '@testing-library/react';

import { TestProviders } from '#mocks';

import { EditRuleModal } from './EditRuleModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

vi.mock('#components/rules/RuleEditor', () => ({
  RuleEditor: () => <div data-testid="rule-editor" />,
}));

const rule = {
  id: 'rule-1',
  stage: null,
  conditionsOp: 'and',
  conditions: [],
  actions: [],
} as unknown as RuleEntity;

function renderModal() {
  return render(
    <TestProviders>
      <EditRuleModal rule={rule} />
    </TestProviders>,
  );
}

describe('EditRuleModal', () => {
  beforeEach(() => {
    undo.setUndoState('openModal', null);
  });

  test('tags itself on the undo state while open', () => {
    renderModal();

    expect(undo.getUndoState('openModal')).toEqual({
      name: 'edit-rule',
      options: { rule },
    });
  });

  test('clears the undo state once closed', () => {
    const { unmount } = renderModal();
    unmount();

    expect(undo.getUndoState('openModal')).toBeNull();
  });

  test('restores a modal tagged underneath it once closed', () => {
    // `openModal` is global, so closing this modal must not clobber the tag
    // belonging to a modal that was already open underneath it.
    const underlying = { name: 'schedule-edit', options: { id: 'sched-1' } };
    undo.setUndoState('openModal', underlying);

    const { unmount } = renderModal();
    expect(undo.getUndoState('openModal')).toEqual({
      name: 'edit-rule',
      options: { rule },
    });

    unmount();
    expect(undo.getUndoState('openModal')).toEqual(underlying);
  });

  test('leaves the tag alone if something else has taken it over', () => {
    undo.setUndoState('openModal', {
      name: 'schedule-edit',
      options: { id: 'sched-1' },
    });

    const { unmount } = renderModal();

    // Stand in for the modal underneath cleaning up first when both are
    // removed together: it hands the tag back before we do.
    undo.setUndoState('openModal', null);
    unmount();

    expect(undo.getUndoState('openModal')).toBeNull();
  });
});
