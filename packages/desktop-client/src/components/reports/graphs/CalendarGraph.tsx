import { type Ref, useEffect, useState } from 'react';
import { Trans } from 'react-i18next';

import {
  addDays,
  format,
  getDate,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import { amountToCurrency } from 'loot-core/shared/util';
import { type SyncedPrefs } from 'loot-core/types/prefs';

import { useResizeObserver } from '../../../hooks/useResizeObserver';
import { styles, theme } from '../../../style';
import { Button } from '../../common/Button2';
import { Tooltip } from '../../common/Tooltip';
import { View } from '../../common/View';
import { PrivacyFilter } from '../../PrivacyFilter';
import { chartTheme } from '../chart-theme';

type CalendarGraphProps = {
  data: {
    date: Date;
    incomeValue: number;
    expenseValue: number;
    incomeSize: number;
    expenseSize: number;
  }[];
  start: Date;
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'];
  onDayClick: (date: Date | null) => void;
};
export function CalendarGraph({
  data,
  start,
  firstDayOfWeekIdx,
  onDayClick,
}: CalendarGraphProps) {
  const startingDate = startOfWeek(new Date(), {
    weekStartsOn:
      firstDayOfWeekIdx !== undefined &&
      !Number.isNaN(parseInt(firstDayOfWeekIdx)) &&
      parseInt(firstDayOfWeekIdx) >= 0 &&
      parseInt(firstDayOfWeekIdx) <= 6
        ? (parseInt(firstDayOfWeekIdx) as 0 | 1 | 2 | 3 | 4 | 5 | 6)
        : 0,
  });
  const [fontSize, setFontSize] = useState(14);

  const buttonRef = useResizeObserver(rect => {
    const newValue = Math.floor(rect.height / 2);
    if (newValue > 14) {
      setFontSize(14);
    } else {
      setFontSize(newValue);
    }
  });

  return (
    <>
      <View
        style={{
          color: theme.pageTextSubdued,
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridAutoRows: '1fr',
          gap: 2,
        }}
        onClick={() => onDayClick(null)}
      >
        {Array.from({ length: 7 }, (_, index) => (
          <View
            key={index}
            style={{
              textAlign: 'center',
              fontSize: 14,
              fontWeight: 500,
              padding: '3px 0',
              height: '100%',
              width: '100%',
              position: 'relative',
              marginBottom: 4,
            }}
          >
            {format(addDays(startingDate, index), 'EEEEE')}
          </View>
        ))}
      </View>
      <View
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridAutoRows: '1fr',
          gap: 2,
          width: '100%',
          height: '100%',
        }}
      >
        {data.map((day, index) =>
          !isSameMonth(day.date, startOfMonth(start)) ? (
            <View
              key={`empty-${day.date.getTime()}`}
              onClick={() => onDayClick(null)}
            />
          ) : day.incomeValue !== 0 || day.expenseValue !== 0 ? (
            <Tooltip
              key={day.date.getTime()}
              content={
                <View>
                  <View style={{ marginBottom: 10 }}>
                    <strong>{format(day.date, 'MMM dd')}</strong>
                  </View>
                  <View style={{ lineHeight: 1.5 }}>
                    <View
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '70px 1fr 60px',
                        gridAutoRows: '1fr',
                      }}
                    >
                      <View
                        style={{
                          textAlign: 'right',
                          marginRight: 4,
                        }}
                      >
                        <Trans>Income</Trans>:
                      </View>
                      <View
                        style={{
                          color: chartTheme.colors.blue,
                          flexDirection: 'row',
                        }}
                      >
                        {day.incomeValue !== 0 ? (
                          <PrivacyFilter>
                            {amountToCurrency(day.incomeValue)}
                          </PrivacyFilter>
                        ) : (
                          ''
                        )}
                      </View>
                      <View style={{ marginLeft: 4, flexDirection: 'row' }}>
                        (
                        <PrivacyFilter>
                          {Math.round(day.incomeSize * 100) / 100 + '%'}
                        </PrivacyFilter>
                        )
                      </View>
                      <View
                        style={{
                          textAlign: 'right',
                          marginRight: 4,
                        }}
                      >
                        <Trans>Expenses</Trans>:
                      </View>
                      <View
                        style={{
                          color: chartTheme.colors.red,
                          flexDirection: 'row',
                        }}
                      >
                        {day.expenseValue !== 0 ? (
                          <PrivacyFilter>
                            {amountToCurrency(day.expenseValue)}
                          </PrivacyFilter>
                        ) : (
                          ''
                        )}
                      </View>
                      <View style={{ marginLeft: 4, flexDirection: 'row' }}>
                        (
                        <PrivacyFilter>
                          {Math.round(day.expenseSize * 100) / 100 + '%'}
                        </PrivacyFilter>
                        )
                      </View>
                    </View>
                  </View>
                </View>
              }
              placement="bottom end"
              style={{
                ...styles.tooltip,
                lineHeight: 1.5,
                padding: '6px 10px',
              }}
            >
              <DayButton
                key={day.date.getTime()}
                resizeRef={el => {
                  if (index === 15 && el) {
                    buttonRef(el);
                  }
                }}
                fontSize={fontSize}
                day={day}
                onPress={() => onDayClick(day.date)}
              />
            </Tooltip>
          ) : (
            <DayButton
              key={day.date.getTime()}
              resizeRef={el => {
                if (index === 15 && el) {
                  buttonRef(el);
                }
              }}
              fontSize={fontSize}
              day={day}
              onPress={() => onDayClick(day.date)}
            />
          ),
        )}
      </View>
    </>
  );
}

type DayButtonProps = {
  fontSize: number;
  resizeRef: Ref<HTMLButtonElement>;
  day: {
    date: Date;
    incomeSize: number;
    expenseSize: number;
  };
  onPress: () => void;
};
function DayButton({ day, onPress, fontSize, resizeRef }: DayButtonProps) {
  const [currentFontSize, setCurrentFontSize] = useState(fontSize);

  useEffect(() => {
    setCurrentFontSize(fontSize);
  }, [fontSize]);

  return (
    <Button
      ref={resizeRef}
      aria-label={format(day.date, 'MMMM d, yyyy')}
      style={{
        borderColor: 'transparent',
        backgroundColor: theme.calendarCellBackground,
        position: 'relative',
        padding: 'unset',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        margin: 0,
      }}
      onPress={() => onPress()}
    >
      {day.expenseSize !== 0 && (
        <View
          style={{
            position: 'absolute',
            width: '50%',
            height: '100%',
            background: chartTheme.colors.red,
            opacity: 0.2,
            right: 0,
          }}
        />
      )}
      {day.incomeSize !== 0 && (
        <View
          style={{
            position: 'absolute',
            width: '50%',
            height: '100%',
            background: chartTheme.colors.blue,
            opacity: 0.2,
            left: 0,
          }}
        />
      )}
      <View
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          opacity: 0.9,
          height: `${Math.ceil(day.incomeSize)}%`,
          backgroundColor: chartTheme.colors.blue,
          width: '50%',
          transition: 'height 0.5s ease-out',
        }}
      />

      <View
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          opacity: 0.9,
          height: `${Math.ceil(day.expenseSize)}%`,
          backgroundColor: chartTheme.colors.red,
          width: '50%',
          transition: 'height 0.5s ease-out',
        }}
      />
      <span
        style={{
          fontSize: `${currentFontSize}px`,
          fontWeight: 500,
          position: 'relative',
        }}
      >
        {getDate(day.date)}
      </span>
    </Button>
  );
}
