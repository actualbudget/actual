import { SvgExclamationSolid } from '../../icons/v1';
import { theme } from '../../style';

import { Paragraph } from '../common/Paragraph';
import { CellValue } from '../spreadsheet/CellValue';
import { Tooltip } from '../tooltips';

import { makeAmountStyle } from './util';
import React, {type ComponentProps, type MouseEvent, type MouseEventHandler, useState} from "react";
import {useSheetValue} from "../spreadsheet/useSheetValue";
import {View} from "../common/View";

type UnbudgetedFutureExpensesProps = {
  balance: ComponentProps<typeof CellValue>['binding'];
  futureSpent: ComponentProps<typeof CellValue>['binding'];
};

function useMouseOverTooltip() {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return {
    getOpenEvents: (events: { onMouseOver?: MouseEventHandler } = {}) => ({
      onMouseOver: (e: MouseEvent) => {
        e.stopPropagation();
        events.onMouseOver?.(e);
        setIsOpen(true);
      },
    }),
    getCloseEvents: (events: { onMouseLeave?: MouseEventHandler } = {}) => ({
      onMouseLeave: (e: MouseEvent) => {
        e.stopPropagation();
        events.onMouseLeave?.(e);
        setIsOpen(false);
      },
    }),
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}

export function UnbudgetedFutureExpenses({
  balance,
  futureSpent,
}: UnbudgetedFutureExpensesProps) {
  const tooltip = useMouseOverTooltip();

  const balanceValue = useSheetValue(balance);
  const futureSpentValue = useSheetValue(futureSpent);

  return (
    futureSpentValue * -1 > balanceValue && (
      <>
        <SvgExclamationSolid
          {...tooltip.getOpenEvents()}
          {...tooltip.getCloseEvents()}
          style={{
            color: theme.warningTextLight,
            height: 15,
            width: 15,
            marginRight: 10,
          }}
        />

        {tooltip.isOpen && (
          <Tooltip
            position="bottom-right"
            onClose={tooltip.close}
            style={{
              padding: 10,
              maxWidth: 400,
            }}
          >
            <Paragraph>
              Upcoming transactions:&nbsp;
              <CellValue
                binding={futureSpent}
                type="financial"
                getStyle={makeAmountStyle}
              />
            </Paragraph>
          </Tooltip>
        )}
      </>
    )
  );
}
