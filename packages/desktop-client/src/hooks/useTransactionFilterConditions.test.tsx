import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';

import type { RuleConditionEntity } from '@actual-app/core/types/models';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { useSyncedPref } from '#hooks/useSyncedPref';

import { useTransactionFilterConditions } from './useTransactionFilterConditions';

vi.mock('#hooks/useSyncedPref', () => ({ useSyncedPref: vi.fn() }));

const condition = {
  field: 'category',
  op: 'is',
  value: 'clothing',
  type: 'id',
} satisfies RuleConditionEntity;

describe('useTransactionFilterConditions', () => {
  let setPref: Mock<(value: string | undefined) => void>;

  function renderTestHook(
    accountId: string | undefined,
    locationState?: Record<string, unknown>,
  ) {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter
        initialEntries={[{ pathname: '/accounts/one', state: locationState }]}
      >
        {children}
      </MemoryRouter>
    );
    return renderHook(() => useTransactionFilterConditions(accountId), {
      wrapper,
    });
  }

  function setSavedPref(value: string | undefined) {
    vi.mocked(useSyncedPref).mockReturnValue([value, setPref]);
  }

  beforeEach(() => {
    setPref = vi.fn<(value: string | undefined) => void>();
    setSavedPref(undefined);
  });

  it('returns no filters when nothing is saved', () => {
    const { result } = renderTestHook('one');

    expect(result.current.filterConditions).toEqual([]);
    expect(result.current.filterConditionsOp).toBe('and');
  });

  it('reads the pref for the given account', () => {
    renderTestHook('one');
    expect(useSyncedPref).toHaveBeenCalledWith('transaction-table-filters-one');

    renderTestHook(undefined);
    expect(useSyncedPref).toHaveBeenCalledWith(
      'transaction-table-filters-all-accounts',
    );
  });

  it('restores the saved filters and operator', () => {
    setSavedPref(
      JSON.stringify({ conditions: [condition], conditionsOp: 'or' }),
    );

    const { result } = renderTestHook('one');

    expect(result.current.filterConditions).toEqual([condition]);
    expect(result.current.filterConditionsOp).toBe('or');
  });

  it('prefers filters passed via navigation state over the saved ones', () => {
    const locationCondition = { ...condition, value: 'food' };
    setSavedPref(
      JSON.stringify({ conditions: [condition], conditionsOp: 'or' }),
    );

    const { result } = renderTestHook('one', {
      filterConditions: [locationCondition],
    });

    expect(result.current.filterConditions).toEqual([locationCondition]);
    expect(result.current.filterConditionsOp).toBe('and');
  });

  it('ignores an unparseable saved value', () => {
    setSavedPref('not json');

    const { result } = renderTestHook('one');

    expect(result.current.filterConditions).toEqual([]);
    expect(result.current.filterConditionsOp).toBe('and');
  });

  it('ignores a saved value whose conditions are not an array', () => {
    setSavedPref(JSON.stringify({ conditions: 5, conditionsOp: 'or' }));

    const { result } = renderTestHook('one');

    expect(result.current.filterConditions).toEqual([]);
    expect(result.current.filterConditionsOp).toBe('and');
  });

  it('persists filters as serialized JSON', () => {
    const { result } = renderTestHook('one');

    result.current.onSaveFilterConditions([condition], 'or');

    expect(setPref).toHaveBeenCalledWith(
      JSON.stringify({ conditions: [condition], conditionsOp: 'or' }),
    );
  });

  it('clears the pref when the filters are removed', () => {
    setSavedPref(
      JSON.stringify({ conditions: [condition], conditionsOp: 'and' }),
    );
    const { result } = renderTestHook('one');

    result.current.onSaveFilterConditions([], 'and');

    expect(setPref).toHaveBeenCalledWith('');
  });

  it('skips writing when the filters have not changed', () => {
    setSavedPref(
      JSON.stringify({ conditions: [condition], conditionsOp: 'and' }),
    );
    const { result } = renderTestHook('one');

    result.current.onSaveFilterConditions([condition], 'and');

    expect(setPref).not.toHaveBeenCalled();
  });

  it('skips clearing a pref that is already empty', () => {
    const { result } = renderTestHook('one');

    result.current.onSaveFilterConditions([], 'and');

    expect(setPref).not.toHaveBeenCalled();
  });
});
