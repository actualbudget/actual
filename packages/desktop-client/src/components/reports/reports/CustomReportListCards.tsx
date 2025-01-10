import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { addNotification } from 'loot-core/client/notifications/notificationsSlice';
import { send, sendCatch } from 'loot-core/platform/client/fetch/index';
import { calculateHasWarning } from 'loot-core/src/client/reports';
import * as monthUtils from 'loot-core/src/shared/months';
import { type CustomReportEntity } from 'loot-core/types/models/reports';

import { useAccounts } from '../../../hooks/useAccounts';
import { useCategories } from '../../../hooks/useCategories';
import { usePayees } from '../../../hooks/usePayees';
import { useSyncedPref } from '../../../hooks/useSyncedPref';
import { SvgExclamationSolid } from '../../../icons/v1';
import { useDispatch } from '../../../redux';
import { styles } from '../../../style/index';
import { theme } from '../../../style/theme';
import { Text } from '../../common/Text';
import { Tooltip } from '../../common/Tooltip';
import { View } from '../../common/View';
import { DateRange } from '../DateRange';
import { ReportCard } from '../ReportCard';
import { ReportCardName } from '../ReportCardName';

import { GetCardData } from './GetCardData';
import { MissingReportCard } from './MissingReportCard';

type CustomReportListCardsProps = {
  isEditing?: boolean;
  report?: CustomReportEntity;
  onRemove: () => void;
};

export function CustomReportListCards({
  isEditing,
  report,
  onRemove,
}: CustomReportListCardsProps) {
  const { t } = useTranslation();

  // It's possible for a dashboard to reference a non-existing
  // custom report
  if (!report) {
    return (
      <MissingReportCard isEditing={isEditing} onRemove={onRemove}>
        {t('This custom report has been deleted.')}
      </MissingReportCard>
    );
  }

  return (
    <CustomReportListCardsInner
      isEditing={isEditing}
      report={report}
      onRemove={onRemove}
    />
  );
}

function CustomReportListCardsInner({
  isEditing,
  report,
  onRemove,
}: Omit<CustomReportListCardsProps, 'report'> & {
  report: CustomReportEntity;
}) {
  const dispatch = useDispatch();

  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const [earliestTransaction, setEarliestTransaction] = useState('');

  const payees = usePayees();
  const accounts = useAccounts();
  const categories = useCategories();

  const hasWarning = calculateHasWarning(report.conditions ?? [], {
    categories: categories.list,
    payees,
    accounts,
  });

  const [_firstDayOfWeekIdx] = useSyncedPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';

  useEffect(() => {
    async function run() {
      const trans = await send('get-earliest-transaction');
      setEarliestTransaction(trans ? trans.date : monthUtils.currentDay());
    }
    run();
  }, []);

  const onSaveName = async (name: string) => {
    const updatedReport = {
      ...report,
      name,
    };

    const response = await sendCatch('report/update', updatedReport);

    if (response.error) {
      dispatch(
        addNotification({
          type: 'error',
          message: `Failed saving report name: ${response.error.message}`,
        }),
      );
      setNameMenuOpen(true);
      return;
    }

    setNameMenuOpen(false);
  };

  return (
    <ReportCard
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/custom/${report.id}`}
      menuItems={[
        {
          name: 'rename',
          text: 'Rename',
        },
        {
          name: 'remove',
          text: 'Remove',
        },
      ]}
      onMenuSelect={item => {
        switch (item) {
          case 'remove':
            onRemove();
            break;
          case 'rename':
            setNameMenuOpen(true);
            break;
        }
      }}
    >
      <View style={{ flex: 1, padding: 10 }}>
        <View
          style={{
            flexShrink: 0,
            paddingBottom: 5,
          }}
        >
          <View style={{ flex: 1 }}>
            <ReportCardName
              name={report.name}
              isEditing={nameMenuOpen}
              onChange={onSaveName}
              onClose={() => setNameMenuOpen(false)}
            />
            {report.isDateStatic ? (
              <DateRange start={report.startDate} end={report.endDate} />
            ) : (
              <Text style={{ color: theme.pageTextSubdued }}>
                {report.dateRange}
              </Text>
            )}
          </View>
        </View>
        <GetCardData
          report={report}
          payees={payees}
          accounts={accounts}
          categories={categories}
          earliestTransaction={earliestTransaction}
          firstDayOfWeekIdx={firstDayOfWeekIdx}
          showTooltip={!isEditing}
        />
      </View>
      {hasWarning && (
        <View style={{ padding: 5, position: 'absolute', bottom: 0 }}>
          <Tooltip
            content="The widget is configured to use a non-existing filter value (i.e. category/account/payee). Edit the filters used in this report widget to remove the warning."
            placement="bottom start"
            style={{ ...styles.tooltip, maxWidth: 300 }}
          >
            <SvgExclamationSolid
              width={20}
              height={20}
              style={{ color: theme.warningText }}
            />
          </Tooltip>
        </View>
      )}
    </ReportCard>
  );
}
