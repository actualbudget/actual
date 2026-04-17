import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { SvgExclamationSolid } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type { CustomReportEntity } from '@actual-app/core/types/models';

import { DateRange } from '#components/reports/DateRange';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import { useDashboardWidgetCopyMenu } from '#components/reports/useDashboardWidgetCopyMenu';
import { calculateHasWarning } from '#components/reports/util';
import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { usePayees } from '#hooks/usePayees';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import { useUpdateReportMutation } from '#reports/mutations';

import { GetCardData } from './GetCardData';
import { MissingReportCard } from './MissingReportCard';

type CustomReportListCardsProps = {
  isEditing?: boolean;
  report?: CustomReportEntity;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function CustomReportListCards({
  isEditing,
  report,
  onRemove,
  onCopy,
}: CustomReportListCardsProps) {
  // It's possible for a dashboard to reference a non-existing
  // custom report
  if (!report) {
    return (
      <MissingReportCard isEditing={isEditing} onRemove={onRemove}>
        <Trans>This custom report has been deleted.</Trans>
      </MissingReportCard>
    );
  }

  return (
    <CustomReportListCardsInner
      isEditing={isEditing}
      report={report}
      onRemove={onRemove}
      onCopy={onCopy}
    />
  );
}

function CustomReportListCardsInner({
  isEditing,
  report,
  onRemove,
  onCopy,
}: Omit<CustomReportListCardsProps, 'report'> & {
  report: CustomReportEntity;
}) {
  const { t } = useTranslation();

  const dispatch = useDispatch();

  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const [earliestTransaction, setEarliestTransaction] = useState('');
  const [latestTransaction, setLatestTransaction] = useState('');

  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);

  const { data: payees = [] } = usePayees();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = { list: [], grouped: [] } } = useCategories();

  const hasWarning = calculateHasWarning(report.conditions ?? [], {
    categories: categories.list,
    payees,
    accounts,
  });

  const [_firstDayOfWeekIdx] = useSyncedPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';

  useEffect(() => {
    async function run() {
      const earliestTrans = await send('get-earliest-transaction');
      const latestTrans = await send('get-latest-transaction');
      setEarliestTransaction(
        earliestTrans ? earliestTrans.date : monthUtils.currentDay(),
      );
      setLatestTransaction(
        latestTrans ? latestTrans.date : monthUtils.currentDay(),
      );
    }
    void run();
  }, []);

  const updateReportMutation = useUpdateReportMutation();

  const onSaveName = async (name: string) => {
    const updatedReport = {
      ...report,
      name,
    };

    updateReportMutation.mutate(
      { report: updatedReport },
      {
        onSuccess: () => {
          setNameMenuOpen(false);
        },
        onError: error => {
          dispatch(
            addNotification({
              notification: {
                type: 'error',
                message: t('Failed saving report name: {{error}}', {
                  error: error.message,
                }),
              },
            }),
          );
          setNameMenuOpen(true);
        },
      },
    );
  };

  return (
    <ReportCard
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/custom/${report.id}`}
      menuItems={[
        {
          name: 'rename',
          text: t('Rename'),
        },
        {
          name: 'remove',
          text: t('Remove'),
        },
        ...copyMenuItems,
      ]}
      onMenuSelect={item => {
        if (handleCopyMenuSelect(item)) return;
        switch (item) {
          case 'remove':
            onRemove();
            break;
          case 'rename':
            setNameMenuOpen(true);
            break;
          default:
            throw new Error(`Unrecognized menu option: ${item}`);
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
                {t(report.dateRange)}
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
          latestTransaction={latestTransaction}
          firstDayOfWeekIdx={firstDayOfWeekIdx}
          showTooltip={!isEditing}
        />
      </View>
      {hasWarning && (
        <View style={{ padding: 5, position: 'absolute', bottom: 0 }}>
          <Tooltip
            content={t(
              'The widget is configured to use a non-existing filter value (i.e. category/account/payee). Edit the filters used in this report widget to remove the warning.',
            )}
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
