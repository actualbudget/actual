import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Paragraph } from '@actual-app/components/paragraph';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import {
  EVERY_CURRENCY,
  getOwnLineStart,
  serializeOwnLines,
} from '@actual-app/core/shared/fx/ownLines';
import * as monthUtils from '@actual-app/core/shared/months';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '#components/common/Modal';
import { useCurrencyOptions } from '#components/currency/useCurrencyOptions';
import { Checkbox } from '#components/forms';
import {
  useCategoryCurrencies,
  useOwnLineCurrencies,
} from '#hooks/useCategoryCurrencies';
import { loadPrefs } from '#prefs/prefsSlice';
import { useDispatch } from '#redux';

type Mode = 'none' | 'all' | 'selected';

// What the user is asked before saving: whether earlier spending in newly
// chosen currencies moves into lines, then whether lines in currencies no
// longer chosen go away
type Question =
  | { kind: 'earlier'; currencies: string[] }
  | {
      kind: 'lines';
      currencies: string[];
      from: number;
      moveEarlier: string[];
    };

// Chooses, budget-wide, the currencies whose spending gets a line of its own
// in its category, budgeted in that currency; the rest is converted into
// the category. A budgeting choice, not a view: each line is an envelope.
export function CurrencyOwnLinesModal() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { getCurrencyName } = useCurrencyOptions();
  const { starts, accountCurrencies, isChosen } = useOwnLineCurrencies();
  const { currencies: lines } = useCategoryCurrencies();
  const listed = [...starts.keys()].filter(code => code !== EVERY_CURRENCY);
  const options = [...new Set([...accountCurrencies, ...listed])].sort();

  const [mode, setMode] = useState<Mode>(
    starts.has(EVERY_CURRENCY)
      ? 'all'
      : listed.length > 0
        ? 'selected'
        : 'none',
  );
  const [selected, setSelected] = useState(() => new Set(listed));
  const [question, setQuestion] = useState<Question | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const willBeChosen = (code: string) =>
    mode === 'all' || (mode === 'selected' && selected.has(code));

  // `from` (YYYYMM, 0 for every month) is the first month of the currencies
  // chosen now; those chosen before keep theirs
  const getValue = (from: number) => {
    const next = new Map<string, number>();
    if (mode === 'all') {
      const every = starts.get(EVERY_CURRENCY) ?? from;
      next.set(EVERY_CURRENCY, every);
      for (const code of options) {
        const start = getOwnLineStart(starts, code);
        if (start != null && start !== every) {
          next.set(code, start);
        }
      }
    } else if (mode === 'selected') {
      for (const code of selected) {
        next.set(code, getOwnLineStart(starts, code) ?? from);
      }
    }
    return serializeOwnLines(next);
  };

  const commit = async (
    from: number,
    moveEarlier: string[],
    dropCurrencies: string[],
    close: () => void,
  ) => {
    setIsSaving(true);
    try {
      await send('currency-own-lines-save', {
        value: getValue(from),
        moveEarlier,
        dropCurrencies,
      });
      // Saved by the server, so the preferences are read again
      await dispatch(loadPrefs());
      close();
    } finally {
      setIsSaving(false);
    }
  };

  // Lines that categories keep in currencies that stop being chosen,
  // budgeted in or added before: the user decides whether they go away.
  // Lines added to a category in a currency that wasn't chosen stay.
  const leaving = [
    ...new Set(
      lines
        .filter(
          line =>
            !line.automatic &&
            isChosen(line.currency) &&
            !willBeChosen(line.currency),
        )
        .map(line => line.currency),
    ),
  ].sort();

  const askAboutLines = async (
    from: number,
    moveEarlier: string[],
    close: () => void,
  ) => {
    if (leaving.length > 0) {
      setQuestion({ kind: 'lines', currencies: leaving, from, moveEarlier });
      return;
    }
    await commit(from, moveEarlier, [], close);
  };

  // Without earlier spending in the newly chosen currencies their lines
  // cover every month, so history imported later shows up in them too.
  // Otherwise the user decides whether earlier months stay as budgeted.
  const save = async (close: () => void) => {
    const currencies = await send('category-currency-earlier-spending', {
      month: monthUtils.currentMonth(),
    });
    const newlyChosen = currencies.filter(
      code => willBeChosen(code) && !isChosen(code),
    );
    if (newlyChosen.length > 0) {
      setQuestion({ kind: 'earlier', currencies: newlyChosen });
      return;
    }
    await askAboutLines(0, [], close);
  };

  const currentMonth = parseInt(monthUtils.currentMonth().replace('-', ''));

  return (
    <Modal name="currency-own-lines">
      {({ state }) => (
        <>
          <ModalHeader
            title={
              <ModalTitle
                title={t('Budget currencies on their own')}
                shrinkOnOverflow
              />
            }
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ gap: 15, maxWidth: 480, lineHeight: 1.5 }}>
            <Paragraph style={{ margin: 0 }}>
              <Trans>
                Spending in a currency budgeted on its own gets a line of its
                own in its category, budgeted and kept in that currency.
                Spending in any other currency is converted into its
                category&apos;s budget.
              </Trans>
            </Paragraph>
            <Paragraph style={{ margin: 0 }}>
              <Trans>
                This applies to every category. To add a currency to just one
                category, use Add currency in its menu.
              </Trans>
            </Paragraph>

            <View style={{ gap: 5 }}>
              <label htmlFor="currency-own-lines-mode">
                <Text style={{ fontWeight: 600 }}>
                  <Trans>Currencies budgeted on their own</Trans>
                </Text>
              </label>
              <Select
                id="currency-own-lines-mode"
                value={mode}
                onChange={value => {
                  setMode(value);
                  setQuestion(null);
                }}
                options={[
                  ['none', t('None, convert all spending')],
                  ['all', t('Every currency')],
                  ['selected', t('Only the currencies chosen below')],
                ]}
                style={{ maxWidth: '100%' }}
              />
            </View>

            {mode === 'selected' && (
              <View style={{ gap: 8 }}>
                {options.length === 0 ? (
                  <Text style={{ color: theme.pageTextLight }}>
                    <Trans>No account is in another currency yet.</Trans>
                  </Text>
                ) : (
                  options.map(code => (
                    <View
                      key={code}
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                      <Checkbox
                        id={`currency-own-line-${code}`}
                        checked={selected.has(code)}
                        onChange={e => {
                          const next = new Set(selected);
                          if (e.target.checked) {
                            next.add(code);
                          } else {
                            next.delete(code);
                          }
                          setSelected(next);
                          setQuestion(null);
                        }}
                      />
                      <label htmlFor={`currency-own-line-${code}`}>
                        {code} – {getCurrencyName(code)}
                      </label>
                    </View>
                  ))
                )}
              </View>
            )}

            {question?.kind === 'earlier' && (
              <Text style={{ color: theme.warningText }}>
                {t(
                  'Earlier months have spending in {{currencies}}, converted into their categories. Keep those months as they were budgeted, or move that spending into currency lines too? Lines in months with nothing budgeted in them show as overspent.',
                  { currencies: question.currencies.join(', ') },
                )}
              </Text>
            )}
            {question?.kind === 'lines' && (
              <Text style={{ color: theme.warningText }}>
                {t(
                  "Categories have lines in {{currencies}}, which will no longer be budgeted on their own. Move their budgets into their categories, converted at each month's rate, so their spending is converted there too? Or keep those lines as they are.",
                  { currencies: question.currencies.join(', ') },
                )}
              </Text>
            )}

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <Button isDisabled={isSaving} onPress={() => state.close()}>
                <Trans>Cancel</Trans>
              </Button>
              {question?.kind === 'earlier' ? (
                <>
                  <Button
                    isDisabled={isSaving}
                    onPress={() =>
                      void askAboutLines(0, question.currencies, () =>
                        state.close(),
                      )
                    }
                  >
                    <Trans>Move it into lines too</Trans>
                  </Button>
                  <Button
                    variant="primary"
                    isDisabled={isSaving}
                    onPress={() =>
                      void askAboutLines(currentMonth, [], () => state.close())
                    }
                  >
                    <Trans>Keep earlier months</Trans>
                  </Button>
                </>
              ) : question?.kind === 'lines' ? (
                <>
                  <Button
                    isDisabled={isSaving}
                    onPress={() =>
                      void commit(question.from, question.moveEarlier, [], () =>
                        state.close(),
                      )
                    }
                  >
                    <Trans>Keep the lines</Trans>
                  </Button>
                  <Button
                    variant="primary"
                    isDisabled={isSaving}
                    onPress={() =>
                      void commit(
                        question.from,
                        question.moveEarlier,
                        question.currencies,
                        () => state.close(),
                      )
                    }
                  >
                    <Trans>Move into categories</Trans>
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  isDisabled={isSaving}
                  onPress={() => void save(() => state.close())}
                >
                  <Trans>Save</Trans>
                </Button>
              )}
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
