import { send } from '@actual-app/core/platform/client/connection';
import type { CategoryEntity } from '@actual-app/core/types/models';
import type { TFunction } from 'i18next';

import type { CategoryLine } from '#hooks/useCategoryCurrencies';
import type { Modal } from '#modals/modalsSlice';
import { addNotification } from '#notifications/notificationsSlice';
import type { useDispatch } from '#redux';

// Adds a line in `currency` to one category from `month` ('YYYY-MM'), the
// month on screen, on: later months keep it, earlier months stay as they
// were budgeted. Which currencies get lines everywhere is chosen budget-wide.
export async function addCurrencyLine(
  dispatch: ReturnType<typeof useDispatch>,
  t: TFunction,
  category: Pick<CategoryEntity, 'id' | 'name'>,
  currency: string,
  month: string,
): Promise<void> {
  try {
    await send('category-currency-add', {
      category: category.id,
      currency,
      startMonth: month,
    });
  } catch {
    dispatch(
      addNotification({
        notification: {
          type: 'error',
          message: t('A {{currency}} line could not be added to {{name}}.', {
            name: category.name,
            currency,
          }),
        },
      }),
    );
  }
}

// Adds a line in each of `currencies` to one category from `month` on, as
// `addCurrencyLine` does
export async function addCurrencyLines(
  dispatch: ReturnType<typeof useDispatch>,
  t: TFunction,
  category: Pick<CategoryEntity, 'id' | 'name'>,
  currencies: string[],
  month: string,
): Promise<void> {
  for (const currency of currencies) {
    await addCurrencyLine(dispatch, t, category, currency, month);
  }
}

// "COP and USD", in the language of the app
export function listCurrencies(currencies: string[], language: string) {
  try {
    return new Intl.ListFormat(language || undefined, {
      type: 'conjunction',
    }).format(currencies);
  } catch {
    return currencies.join(', ');
  }
}

// Picks any currency for a line of one category from `month` on, such as
// one for a trip abroad
export function addOtherCurrencyModal(
  category: Pick<CategoryEntity, 'id' | 'name'>,
  month: string,
): Modal {
  return { name: 'category-currency-add', options: { category, month } };
}

// Confirms removing a currency line from its category
export function removeCurrencyModal(
  t: TFunction,
  category: Pick<CategoryEntity, 'name'>,
  line: CategoryLine,
): Modal {
  return {
    name: 'confirm-delete',
    options: {
      message: t(
        'Remove {{currency}} from {{name}}? Its budget moves to {{name}}, converted at the rate of each month. Its spending shows up in {{name}} again, unless {{currency}} is budgeted on its own.',
        { currency: line.currencyCode, name: category.name },
      ),
      onConfirm: () => {
        void send('category-currency-remove', { id: line.id });
      },
    },
  };
}
