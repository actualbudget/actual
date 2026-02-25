import { renderHook } from '@testing-library/react';

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

describe('useTransactionBatchActions', () => {
  beforeEach(() => {
    dispatchMock.mockReset();
    pushModalMock.mockClear();
    aqlQueryMock.mockReset();
  });

  it('warns before delete when transfer pair contains a reconciled transaction', async () => {
    aqlQueryMock.mockResolvedValueOnce({
      data: [{ id: 'tx-1', transfer_id: 'tx-peer' }],
      dependencies: [],
    });
    aqlQueryMock.mockResolvedValueOnce({
      data: [{ id: 'tx-peer', reconciled: true }],
      dependencies: [],
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
