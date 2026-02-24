import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTransactionBatchActions } from './useTransactionBatchActions';

const { dispatchMock, pushModalMock, aqlQueryMock } = vi.hoisted(() => ({
  dispatchMock: vi.fn(),
  pushModalMock: vi.fn((payload: { modal: { name: string } }) => payload.modal),
  aqlQueryMock: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}));

vi.mock('@desktop-client/redux', () => ({
  useDispatch: () => dispatchMock,
}));

vi.mock('@desktop-client/modals/modalsSlice', () => ({
  pushModal: pushModalMock,
}));

vi.mock('@desktop-client/queries/aqlQuery', () => ({
  aqlQuery: aqlQueryMock,
}));

function collectOneOfIds(node: unknown): string[] {
  if (!node || typeof node !== 'object') {
    return [];
  }

  if (
    'id' in node &&
    node.id &&
    typeof node.id === 'object' &&
    '$oneof' in node.id &&
    Array.isArray(node.id.$oneof)
  ) {
    return node.id.$oneof as string[];
  }

  return Object.values(node).flatMap(value => collectOneOfIds(value));
}

function includesReconciledTrue(node: unknown): boolean {
  if (!node || typeof node !== 'object') {
    return false;
  }

  if ('reconciled' in node && node.reconciled === true) {
    return true;
  }

  return Object.values(node).some(value => includesReconciledTrue(value));
}

describe('useTransactionBatchActions', () => {
  beforeEach(() => {
    dispatchMock.mockReset();
    pushModalMock.mockClear();
    aqlQueryMock.mockReset();
  });

  it('warns before delete when transfer pair contains a reconciled transaction', async () => {
    aqlQueryMock.mockImplementation(async query => {
      const serialized = query.serialize();
      const ids = collectOneOfIds(serialized.filter);

      if (includesReconciledTrue(serialized.filter)) {
        return {
          data: ids.includes('tx-peer') ? [{ id: 'tx-peer', reconciled: true }] : [],
          dependencies: [],
        };
      }

      return {
        data: [{ id: 'tx-1', transfer_id: 'tx-peer' }],
        dependencies: [],
      };
    });

    const { result } = renderHook(() => useTransactionBatchActions());

    await result.current.onBatchDelete({ ids: ['tx-1'] });

    expect(aqlQueryMock).toHaveBeenCalledTimes(2);
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'confirm-transaction-edit' }),
    );
  });
});
