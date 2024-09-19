import React, { useState, useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import * as monthUtils from 'loot-core/src/shared/months';
import { amountToCurrency } from 'loot-core/src/shared/util';
import { type SpendingWidget } from 'loot-core/src/types/models';

import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import { useLocalPref } from '../../../hooks/useLocalPref';
import { styles } from '../../../style/styles';
import { theme } from '../../../style/theme';
import { Block } from '../../common/Block';
import { View } from '../../common/View';
import { PrivacyFilter } from '../../PrivacyFilter';
import { DateRange } from '../DateRange';
import { SpendingGraph } from '../graphs/SpendingGraph';
import { LoadingIndicator } from '../LoadingIndicator';
import { ReportCard } from '../ReportCard';
import { ReportCardName } from '../ReportCardName';
import { createSpendingSpreadsheet } from '../spreadsheets/spending-spreadsheet';
import { useReport } from '../useReport';

import { MissingReportCard } from './MissingReportCard';

type SpendingCardProps = {
  isEditing?: boolean;
  meta?: SpendingWidget['meta'];
  onMetaChange: (newMeta: SpendingWidget['meta']) => void;
  onRemove: () => void;
};

export function SpendingCard({
  isEditing,
  meta,
  onMetaChange,
  onRemove,
}: SpendingCardProps) {
  const { t } = useTranslation();

  const [isCardHovered, setIsCardHovered] = useState(false);
  const [spendingReportFilter = ''] = useLocalPref('spendingReportFilter');
  const [spendingReportMode = 'singleMonth'] =
    useLocalPref('spendingReportMode');
  const [spendingReportCompare = monthUtils.currentMonth()] = useLocalPref(
    'spendingReportCompare',
  );
  const [spendingReportCompareTo = monthUtils.currentMonth()] = useLocalPref(
    'spendingReportCompareTo',
  );

  const [nameMenuOpen, setNameMenuOpen] = useState(false);

  const selection =
    spendingReportMode === 'singleMonth' ? 'compareTo' : spendingReportMode;
  const parseFilter = spendingReportFilter && JSON.parse(spendingReportFilter);
  const isDateValid = monthUtils.parseDate(spendingReportCompare);
  const getGraphData = useMemo(() => {
    return createSpendingSpreadsheet({
      conditions: parseFilter.conditions,
      conditionsOp: parseFilter.conditionsOp,
      compare:
        isDateValid.toString() === 'Invalid Date'
          ? monthUtils.currentMonth()
          : spendingReportCompare,
      compareTo: spendingReportCompareTo,
    });
  }, [
    parseFilter,
    spendingReportCompare,
    spendingReportCompareTo,
    isDateValid,
  ]);

  const data = useReport('default', getGraphData);
  const todayDay =
    spendingReportCompare !== monthUtils.currentMonth()
      ? 27
      : monthUtils.getDay(monthUtils.currentDay()) - 1 >= 28
        ? 27
        : monthUtils.getDay(monthUtils.currentDay()) - 1;
  const difference =
    data &&
    data.intervalData[todayDay][selection] -
      data.intervalData[todayDay].compare;
  const showCompareTo = data && Math.abs(data.intervalData[27].compareTo) > 0;

  const spendingReportFeatureFlag = useFeatureFlag('spendingReport');

  if (!spendingReportFeatureFlag) {
    return (
      <MissingReportCard isEditing={isEditing} onRemove={onRemove}>
        <Trans>
          The experimental spending report feature has not been enabled.
        </Trans>
      </MissingReportCard>
    );
  }
  return (
    <ReportCard
      isEditing={isEditing}
      to="/reports/spending"
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
        style={{ flex: 1 }}
        onPointerEnter={() => setIsCardHovered(true)}
        onPointerLeave={() => setIsCardHovered(false)}
      >
        <View style={{ flexDirection: 'row', padding: 20 }}>
          <View style={{ flex: 1 }}>
            <ReportCardName
              name={meta?.name || t('Monthly Spending')}
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
            <DateRange
              start={spendingReportCompare}
              end={spendingReportCompareTo}
              type={spendingReportMode}
            />
          </View>
          {data && showCompareTo && (
            <View style={{ textAlign: 'right' }}>
              <Block
                style={{
                  ...styles.mediumText,
                  fontWeight: 500,
                  marginBottom: 5,
                  color: !difference
                    ? 'inherit'
                    : difference <= 0
                      ? theme.noticeTextLight
                      : theme.errorText,
                }}
              >
                <PrivacyFilter activationFilters={[!isCardHovered]}>
                  {data &&
                    (difference && difference > 0 ? '+' : '') +
                      amountToCurrency(difference)}
                </PrivacyFilter>
              </Block>
            </View>
          )}
        </View>
        {!showCompareTo || isDateValid.toString() === 'Invalid Date' ? (
          <View style={{ padding: 5 }}>
            <p style={{ margin: 0, textAlign: 'center' }}>
              <Trans>Additional data required to generate graph</Trans>
            </p>
          </View>
        ) : data ? (
          <SpendingGraph
            style={{ flex: 1 }}
            compact={true}
            data={data}
            mode={spendingReportMode}
            compare={spendingReportCompare}
            compareTo={spendingReportCompareTo}
          />
        ) : (
          <LoadingIndicator message={t('Loading report...')} />
        )}
      </View>
    </ReportCard>
  );
}
