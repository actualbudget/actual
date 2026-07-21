import type { NewRuleEntity } from '@actual-app/core/types/models';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EditRuleModal } from './EditRuleModal';

const undoMocks = vi.hoisted(() => ({
  getUndoState: vi.fn(),
  setUndoState: vi.fn(),
}));

vi.mock('@actual-app/core/platform/client/undo', () => undoMocks);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}));

vi.mock('#components/common/Modal', () => ({
  Modal: () => null,
  ModalCloseButton: () => null,
  ModalHeader: () => null,
}));

vi.mock('#components/rules/RuleEditor', () => ({
  RuleEditor: () => null,
}));

describe('EditRuleModal', () => {
  beforeEach(() => {
    undoMocks.getUndoState.mockReset();
    undoMocks.setUndoState.mockReset();
  });

  it('restores the edit modal when undoing a rule application', () => {
    const previousModal = {
      name: 'manage-rules',
      options: { payeeId: 'payee-id' },
    };
    const rule = {
      stage: null,
      conditionsOp: 'and',
      conditions: [],
      actions: [],
    } satisfies NewRuleEntity;
    const onSave = vi.fn();
    undoMocks.getUndoState.mockReturnValue(previousModal);

    const { unmount } = render(<EditRuleModal rule={rule} onSave={onSave} />);

    expect(undoMocks.setUndoState).toHaveBeenCalledWith('openModal', {
      name: 'edit-rule',
      options: { rule, onSave },
    });

    unmount();
    expect(undoMocks.setUndoState).toHaveBeenLastCalledWith(
      'openModal',
      previousModal,
    );
  });
});
