import { act, renderHook } from '@testing-library/react';

import { accountBalance } from '#spreadsheet/bindings';

import { useSheetValue } from './useSheetValue';

type Node = { name: string; value: number };
const emitters: Array<(node: Node) => void> = [];
const emit = (node: Node) => emitters.forEach(callback => callback(node));

vi.mock('./useSpreadsheet', () => ({
  useSpreadsheet: () => ({
    bind: (
      _sheet: string,
      _binding: unknown,
      callback: (node: Node) => void,
    ) => {
      emitters.push(callback);
      return () => emitters.splice(emitters.indexOf(callback), 1);
    },
  }),
}));

it('keeps the last value when changes return to the rendered value before a render', () => {
  const binding = accountBalance('checking');
  const name = `account!${binding.name}`;
  const { result } = renderHook(() =>
    useSheetValue<'account', 'balance'>(binding),
  );
  act(() => emit({ name, value: 100 }));
  expect(result.current).toBe(100);

  act(() => {
    emit({ name, value: 90 });
    emit({ name, value: 100 });
  });
  expect(result.current).toBe(100);
});
