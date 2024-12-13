import React, {
  useState,
  useMemo,
  useRef,
  type Ref,
  useEffect,
  type Dispatch,
  type SetStateAction,
  useCallback,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { format } from 'date-fns';
import { debounce } from 'debounce';

import { amountToCurrency } from 'loot-core/shared/util';
import * as monthUtils from 'loot-core/src/shared/months';
import { type CalendarWidget } from 'loot-core/types/models';
import { type SyncedPrefs } from 'loot-core/types/prefs';

import { useMergedRefs } from '../../../hooks/useMergedRefs';
import { useNavigate } from '../../../hooks/useNavigate';
import { useResizeObserver } from '../../../hooks/useResizeObserver';
import { SvgArrowThickDown, SvgArrowThickUp } from '../../../icons/v1';
import { styles, theme } from '../../../style';
import { Block } from '../../common/Block';
import { Button } from '../../common/Button2';
import { Tooltip } from '../../common/Tooltip';
import { View } from '../../common/View';
import { PrivacyFilter } from '../../PrivacyFilter';
import { useResponsive } from '../../responsive/ResponsiveProvider';
import { chartTheme } from '../chart-theme';
import { DateRange } from '../DateRange';
import { CalendarGraph } from '../graphs/CalendarGraph';
import { LoadingIndicator } from '../LoadingIndicator';
import { ReportCard } from '../ReportCard';
import { ReportCardName } from '../ReportCardName';
import { calculateTimeRange } from '../reportRanges';
import {
  type CalendarDataType,
  calendarSpreadsheet,
} from '../spreadsheets/calendar-spreadsheet';
import { useReport } from '../useReport';

type CalendarCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: CalendarWidget['meta'];
  onMetaChange: (newMeta: CalendarWidget['meta']) => void;
  onRemove: () => void;
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'];
};

export function CalendarCard({
  widgetId,
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
  firstDayOfWeekIdx,
}: CalendarCardProps) {
  const { t } = useTranslation();
  const [start, end] = calculateTimeRange(meta?.timeFrame, {
    start: monthUtils.dayFromDate(monthUtils.currentMonth()),
    end: monthUtils.currentDay(),
    mode: 'full',
  });
  const params = useMemo(
    () =>
      calendarSpreadsheet(
        start,
        end,
        meta?.conditions,
        meta?.conditionsOp,
        firstDayOfWeekIdx,
      ),
    [start, end, meta?.conditions, meta?.conditionsOp, firstDayOfWeekIdx],
  );

  const [cardOrientation, setCardOrientation] = useState<'row' | 'column'>(
    'row',
  );
  const { isNarrowWidth } = useResponsive();

  const cardRef = useResizeObserver(rect => {
    if (rect.height > rect.width) {
      setCardOrientation('column');
    } else {
      setCardOrientation('row');
    }
  });

  const data = useReport('calendar', params);

  const [nameMenuOpen, setNameMenuOpen] = useState(false);

  const { totalIncome, totalExpense } = useMemo(() => {
    if (!data) {
      return { totalIncome: 0, totalExpense: 0 };
    }
    return {
      totalIncome: data.calendarData.reduce(
        (prev, cur) => prev + cur.totalIncome,
        0,
      ),
      totalExpense: data.calendarData.reduce(
        (prev, cur) => prev + cur.totalExpense,
        0,
      ),
    };
  }, [data]);

  const [monthNameFormats, setMonthNameFormats] = useState<string[]>([]);
  const [selectedMonthNameFormat, setSelectedMonthNameFormat] =
    useState<string>('MMMM yyyy');

  useEffect(() => {
    if (data) {
      setMonthNameFormats(
        Array(data.calendarData.length).map(() => 'MMMM yyyy'),
      );
    } else {
      setMonthNameFormats([]);
    }
  }, [data]);

  useEffect(() => {
    if (monthNameFormats.length) {
      setSelectedMonthNameFormat(
        monthNameFormats.reduce(
          (a, b) => ((a?.length ?? 0) <= (b?.length ?? 0) ? a : b),
          'MMMM yyyy',
        ),
      );
    } else {
      setSelectedMonthNameFormat('MMMM yyyy');
    }
  }, [monthNameFormats]);

  const calendarLenSize = useMemo(() => {
    if (!data) {
      return 0;
    }

    return data?.calendarData.length;
  }, [data]);

  return (
    <ReportCard
      isEditing={isEditing}
      to={`/reports/calendar/${widgetId}`}
      menuItems={[
        {
          name: 'rename',
          text: t('Rename'),
        },
        {
          name: 'remove',
          text: t('Remove'),
        },
      ]}
      onMenuSelect={item => {
        switch (item) {
          case 'rename':
            setNameMenuOpen(true);
            break;
          case 'remove':
            onRemove();
            break;
          default:
            throw new Error(`Unrecognized selection: ${item}`);
        }
      }}
    >
      <View
        ref={el => el && cardRef(el)}
        style={{ flex: 1, margin: 2, overflow: 'hidden', width: '100%' }}
      >
        <View style={{ flexDirection: 'row', padding: 20, paddingBottom: 0 }}>
          <View style={{ flex: 1, marginBottom: -5 }}>
            <ReportCardName
              name={meta?.name || t('Calendar')}
              isEditing={nameMenuOpen}
              onChange={newName => {
                onMetaChange({
                  ...meta,
                  name: newName,
                });
                setNameMenuOpen(false);
              }}
              onClose={() => setNameMenuOpen(false)}
            />
          </View>
          <View style={{ textAlign: 'right' }}>
            <Block
              style={{
                ...styles.mediumText,
                fontWeight: 500,
              }}
            >
              <Tooltip
                content={
                  <View style={{ lineHeight: 1.5 }}>
                    <View
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '70px 1fr',
                        gridAutoRows: '1fr',
                      }}
                    >
                      {totalIncome !== 0 && (
                        <>
                          <View
                            style={{
                              textAlign: 'right',
                              marginRight: 4,
                            }}
                          >
                            <Trans>Income:</Trans>
                          </View>
                          <View style={{ color: chartTheme.colors.blue }}>
                            {totalIncome !== 0 ? (
                              <PrivacyFilter>
                                {amountToCurrency(totalIncome)}
                              </PrivacyFilter>
                            ) : (
                              ''
                            )}
                          </View>
                        </>
                      )}
                      {totalExpense !== 0 && (
                        <>
                          <View
                            style={{
                              textAlign: 'right',
                              marginRight: 4,
                            }}
                          >
                            <Trans>Expenses:</Trans>
                          </View>
                          <View style={{ color: chartTheme.colors.red }}>
                            {totalExpense !== 0 ? (
                              <PrivacyFilter>
                                {amountToCurrency(totalExpense)}
                              </PrivacyFilter>
                            ) : (
                              ''
                            )}
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                }
              >
                <DateRange start={start} end={end} />
              </Tooltip>
            </Block>
          </View>
        </View>
        <View
          style={{
            height: '100%',
            margin: 6,
            overflowX:
              cardOrientation === 'row'
                ? isNarrowWidth
                  ? 'auto'
                  : calendarLenSize > 4
                    ? 'auto'
                    : 'hidden'
                : 'hidden',
            ...styles.horizontalScrollbar,
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: cardOrientation,
              gap: 16,
              marginTop: 10,
              textAlign: 'left',
              marginBottom: isNarrowWidth ? 4 : 0,
              width:
                cardOrientation === 'row'
                  ? isNarrowWidth
                    ? `${calendarLenSize * 100}%`
                    : calendarLenSize > 4
                      ? `${100 + ((calendarLenSize - 4) % 4) * 25}%`
                      : 'auto'
                  : 'auto',
            }}
          >
            {data ? (
              data.calendarData.map((calendar, index) => (
                <CalendarCardInner
                  key={index}
                  calendar={calendar}
                  firstDayOfWeekIdx={firstDayOfWeekIdx ?? '0'}
                  setMonthNameFormats={setMonthNameFormats}
                  selectedMonthNameFormat={selectedMonthNameFormat}
                  index={index}
                  widgetId={widgetId}
                />
              ))
            ) : (
              <LoadingIndicator />
            )}
          </View>
        </View>
      </View>
    </ReportCard>
  );
}

type CalendarCardInnerProps = {
  calendar: {
    start: Date;
    end: Date;
    data: CalendarDataType[];
    totalExpense: number;
    totalIncome: number;
  };
  firstDayOfWeekIdx: string;
  setMonthNameFormats: Dispatch<SetStateAction<string[]>>;
  selectedMonthNameFormat: string;
  index: number;
  widgetId: string;
};
function CalendarCardInner({
  calendar,
  firstDayOfWeekIdx,
  setMonthNameFormats,
  selectedMonthNameFormat,
  index,
  widgetId,
}: CalendarCardInnerProps) {
  const [monthNameVisible, setMonthNameVisible] = useState(true);
  const monthFormatSizeContainers = useRef<(HTMLSpanElement | null)[]>(
    new Array(5),
  );
  const monthNameContainerRef = useRef<HTMLDivElement>(null);

  const measureMonthFormats = useCallback(() => {
    const measurements = monthFormatSizeContainers.current.map(container => ({
      width: container?.clientWidth ?? 0,
      format: container?.getAttribute('data-format') ?? '',
    }));
    return measurements;
  }, []);

  const debouncedResizeCallback = useMemo(
    () =>
      debounce(() => {
        const measurements = measureMonthFormats();
        const containerWidth = monthNameContainerRef.current?.clientWidth ?? 0;

        const suitableFormat = measurements.find(m => containerWidth > m.width);
        if (suitableFormat) {
          if (
            monthNameContainerRef.current &&
            containerWidth > suitableFormat.width
          ) {
            setMonthNameFormats(prev => {
              const newArray = [...prev];
              newArray[index] = suitableFormat.format;
              return newArray;
            });

            setMonthNameVisible(true);
            return;
          }
        }

        if (
          monthNameContainerRef.current &&
          monthNameContainerRef.current.scrollWidth >
            monthNameContainerRef.current.clientWidth
        ) {
          setMonthNameVisible(false);
        } else {
          setMonthNameVisible(true);
        }
      }, 20),
    [measureMonthFormats, monthNameContainerRef, index, setMonthNameFormats],
  );

  const monthNameResizeRef = useResizeObserver(debouncedResizeCallback);

  useEffect(() => {
    return () => {
      debouncedResizeCallback?.clear();
    };
  }, [debouncedResizeCallback]);

  const mergedRef = useMergedRefs(
    monthNameContainerRef,
    monthNameResizeRef,
  ) as Ref<HTMLDivElement>;

  const navigate = useNavigate();

  const monthFormats = [
    { format: 'MMMM yyyy', text: format(calendar.start, 'MMMM yyyy') },
    { format: 'MMM yyyy', text: format(calendar.start, 'MMM yyyy') },
    { format: 'MMM yy', text: format(calendar.start, 'MMM yy') },
    { format: 'MMM', text: format(calendar.start, 'MMM') },
    { format: '', text: '' },
  ];

  return (
    <View style={{ flex: 1, overflow: 'visible' }}>
      <View
        style={{
          flexDirection: 'row',
          marginLeft: 5,
          marginRight: 5,
        }}
      >
        <View
          ref={mergedRef}
          style={{
            color: theme.pageTextSubdued,
            fontWeight: 'bold',
            flex: 1,
            overflow: 'hidden',
            display: 'block',
            width: '100%',
          }}
        >
          <Button
            variant="bare"
            style={{
              visibility: monthNameVisible ? 'visible' : 'hidden',
              overflow: 'visible',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              width: 'max-content',
              margin: 0,
              padding: 0,
              color: theme.pageTextSubdued,
              fontWeight: 'bold',
              fontSize: '12px',
              marginBottom: 6,
            }}
            onPress={() => {
              navigate(
                `/reports/calendar/${widgetId}?month=${format(calendar.start, 'yyyy-MM')}`,
              );
            }}
          >
            {selectedMonthNameFormat &&
              format(calendar.start, selectedMonthNameFormat)}
          </Button>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              color: chartTheme.colors.blue,
              flexDirection: 'row',
              fontSize: '10px',
              marginRight: 10,
            }}
            aria-label="Income"
          >
            {calendar.totalIncome !== 0 ? (
              <>
                <SvgArrowThickUp
                  width={16}
                  height={16}
                  style={{ flexShrink: 0 }}
                />
                <PrivacyFilter>
                  {amountToCurrency(calendar.totalIncome)}
                </PrivacyFilter>
              </>
            ) : (
              ''
            )}
          </View>
          <View
            style={{
              color: chartTheme.colors.red,
              flexDirection: 'row',
              fontSize: '10px',
            }}
            aria-label="Expenses"
          >
            {calendar.totalExpense !== 0 ? (
              <>
                <SvgArrowThickDown
                  width={16}
                  height={16}
                  style={{ flexShrink: 0 }}
                />
                <PrivacyFilter>
                  {amountToCurrency(calendar.totalExpense)}
                </PrivacyFilter>
              </>
            ) : (
              ''
            )}
          </View>
        </View>
      </View>
      <CalendarGraph
        data={calendar.data}
        start={calendar.start}
        firstDayOfWeekIdx={firstDayOfWeekIdx}
        onDayClick={date => {
          if (date) {
            navigate(
              `/reports/calendar/${widgetId}?day=${format(date, 'yyyy-MM-dd')}`,
            );
          } else {
            navigate(`/reports/calendar/${widgetId}`);
          }
        }}
      />
      <View style={{ fontWeight: 'bold', fontSize: '12px' }}>
        {monthFormats.map((item, idx) => (
          <span
            key={item.format}
            ref={node => {
              if (node) monthFormatSizeContainers.current[idx] = node;
            }}
            style={{ position: 'fixed', top: -9999, left: -9999 }}
            data-format={item.format}
          >
            {item.text}
            {item.text && ':'}
          </span>
        ))}
      </View>
    </View>
  );
}
