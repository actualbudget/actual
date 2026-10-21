import type { CSSProperties } from 'react';
import { Trans } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { Block } from '@actual-app/components/block';
import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import {
  EnvelopeCellValue,
  useEnvelopeSheetValue,
} from '#components/budget/envelope/EnvelopeBudgetComponents';
import { CellValueText } from '#components/spreadsheet/CellValue';
import { useFormat } from '#hooks/useFormat';
import type { FormatType } from '#hooks/useFormat';
import { useFxSummary } from '#hooks/useFxSummary';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import { envelopeBudget } from '#spreadsheet/bindings';

/**
 * Creates a formatter that displays values with explicit +/- signs.
 * Uses Math.abs to avoid double-negative display (e.g., "--$0.00").
 *
 * @param format - The format function from useFormat hook
 * @param invert - If true, shows '-' for positive and '+' for negative
 */
function makeSignedFormatter(
  format: ReturnType<typeof useFormat>,
  invert = false,
) {
  return (value: number, type?: FormatType) => {
    const v = format(Math.abs(value), type);
    if (value === 0) {
      return '-' + v;
    }
    const isPositive = value > 0;
    return invert
      ? isPositive
        ? '-' + v
        : '+' + v
      : isPositive
        ? '+' + v
        : '-' + v;
  };
}

type TotalsListProps = {
  month: string;
  interactive?: boolean;
  prevMonthName: string;
  style?: CSSProperties;
};

export function TotalsList({
  month,
  interactive = true,
  prevMonthName,
  style,
}: TotalsListProps) {
  const format = useFormat();
  const fx = useFxSummary();
  // Currency pockets reserve funds that To Budget subtracts (MC-10).
  const reservationChanges = useEnvelopeSheetValue(
    envelopeBudget.reservationChanges,
  );
  const reservationIncomplete =
    useEnvelopeSheetValue(envelopeBudget.reservationIncomplete) === true;
  const reserved = (reservationChanges ?? 0) !== 0 || reservationIncomplete;
  const dispatch = useDispatch();
  const signedFormatter = makeSignedFormatter(format);
  const invertedSignedFormatter = makeSignedFormatter(format, true);
  return (
    <View style={{ lineHeight: 1.5, ...styles.smallText, ...style }}>
      <View
        style={{
          flexDirection: 'row',
          lineHeight: 1.5,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            textAlign: 'right',
            marginRight: 10,
            minWidth: 50,
          }}
        >
          <Tooltip
            style={{ ...styles.tooltip, lineHeight: 1.5, padding: '6px 10px' }}
            content={
              <>
                <AlignedText
                  left={<Trans>Income:</Trans>}
                  right={
                    <EnvelopeCellValue
                      binding={envelopeBudget.totalIncome}
                      type="financial"
                    />
                  }
                />
                <AlignedText
                  left={<Trans>From last month:</Trans>}
                  right={
                    <EnvelopeCellValue
                      binding={envelopeBudget.fromLastMonth}
                      type="financial"
                    />
                  }
                />
                {fx.visible && (
                  <AlignedText
                    left={<Trans>FX changes:</Trans>}
                    right={
                      <EnvelopeCellValue
                        binding={envelopeBudget.fxChanges}
                        type="financial"
                      />
                    }
                  />
                )}
              </>
            }
            placement="bottom end"
          >
            <EnvelopeCellValue
              binding={envelopeBudget.incomeAvailable}
              type="financial"
            >
              {props => (
                <CellValueText {...props} style={{ fontWeight: 600 }} />
              )}
            </EnvelopeCellValue>
          </Tooltip>
          {fx.visible && (
            <Block style={{ fontSize: 11, lineHeight: 1.5 }}>
              <EnvelopeCellValue
                binding={envelopeBudget.fxChanges}
                type="financial"
              />
            </Block>
          )}

          <EnvelopeCellValue
            binding={envelopeBudget.lastMonthOverspent}
            type="financial"
          >
            {props => (
              <CellValueText
                {...props}
                style={{ fontWeight: 600 }}
                formatter={signedFormatter}
              />
            )}
          </EnvelopeCellValue>

          <EnvelopeCellValue
            binding={envelopeBudget.totalBudgeted}
            type="financial"
          >
            {props => (
              <CellValueText
                {...props}
                style={{ fontWeight: 600 }}
                formatter={signedFormatter}
              />
            )}
          </EnvelopeCellValue>

          <EnvelopeCellValue
            binding={envelopeBudget.forNextMonth}
            type="financial"
          >
            {props => (
              <CellValueText
                {...props}
                style={{ fontWeight: 600 }}
                formatter={invertedSignedFormatter}
              />
            )}
          </EnvelopeCellValue>

          {reserved && (
            <EnvelopeCellValue
              binding={envelopeBudget.reservationChanges}
              type="financial"
            >
              {props => (
                <CellValueText
                  {...props}
                  style={{ fontWeight: 600 }}
                  formatter={invertedSignedFormatter}
                />
              )}
            </EnvelopeCellValue>
          )}
        </View>

        <View>
          <Block>
            <Trans>Available funds</Trans>
          </Block>

          {fx.visible && (
            <Block style={{ fontSize: 11, lineHeight: 1.5 }}>
              <Trans>FX changes (included)</Trans>
            </Block>
          )}
          <Block>
            <Trans>Overspent in {{ prevMonthName }}</Trans>
          </Block>

          <Block>
            <Trans>Budgeted</Trans>
          </Block>

          <Block>
            <Trans>For next month</Trans>
          </Block>

          {reserved && (
            <Block>
              <Trans>Reserved in other currencies</Trans>
            </Block>
          )}
        </View>
      </View>
      {reservationIncomplete && (
        <Block role="status" style={{ textAlign: 'center' }}>
          <Trans>Reservation incomplete</Trans>
        </Block>
      )}
      {fx.visible && (
        <View style={{ alignItems: 'center', gap: 3 }}>
          {fx.incomplete && (
            <>
              <Block role="status">
                <Trans>Valuation incomplete</Trans>
              </Block>
              <Block
                style={{ fontSize: 11, maxWidth: 220, textAlign: 'center' }}
              >
                <Trans>
                  Some holdings could not be valued. Their unavailable amounts
                  are left out of FX changes.
                </Trans>
              </Block>
            </>
          )}
          {interactive && (
            <Button
              variant="bare"
              onPress={() =>
                dispatch(
                  pushModal({
                    modal: { name: 'fx-valuation', options: { month } },
                  }),
                )
              }
            >
              <Trans>FX details</Trans>
            </Button>
          )}
        </View>
      )}
    </View>
  );
}
