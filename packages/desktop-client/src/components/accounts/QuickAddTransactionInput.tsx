import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@actual-app/components/input';
import { currentDay } from '@actual-app/core/shared/months';
import type { AccountEntity } from '@actual-app/core/types/models';

import { useCategories } from '#hooks/useCategories';
import { useDateFormat } from '#hooks/useDateFormat';
import { useFormat } from '#hooks/useFormat';
import { usePayees } from '#hooks/usePayees';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import { parseQuickAddText } from '#transactions/quickAddParser';

type QuickAddTransactionInputProps = {
  /** The account being viewed, or null on pages that show several. */
  accountId: AccountEntity['id'] | null;
  onAdded: () => void;
};

export function QuickAddTransactionInput({
  accountId,
  onAdded,
}: QuickAddTransactionInputProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const format = useFormat();
  const { data: payees = [] } = usePayees();
  const { data: { grouped: categoryGroups } = { grouped: [] } } =
    useCategories();
  const [text, setText] = useState('');

  const onEnter = () => {
    if (text.trim() === '') {
      return;
    }

    const parsed = parseQuickAddText(text, {
      today: currentDay(),
      dateFormat,
      parseAmount: value => format.fromEdit(value),
      payees,
      categoryGroups,
    });

    dispatch(
      pushModal({
        modal: {
          name: 'quick-add-transaction',
          options: {
            parsed,
            accountId,
            onAdded: () => {
              setText('');
              onAdded();
            },
          },
        },
      }),
    );
  };

  return (
    <Input
      aria-label={t('Quick Add')}
      placeholder={t('Quick Add: Spent $90 at Whole Foods for food')}
      value={text}
      onChangeValue={setText}
      onEnter={onEnter}
      onEscape={() => setText('')}
      style={{ width: 300 }}
    />
  );
}
