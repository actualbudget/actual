import React, { useEffect, useState } from 'react';

import { send, sendCatch } from 'loot-core/platform/client/fetch/index';
import * as monthUtils from 'loot-core/src/shared/months';
import { type CustomReportEntity } from 'loot-core/types/models/reports';

import { useAccounts } from '../../../hooks/useAccounts';
import { useCategories } from '../../../hooks/useCategories';
import { useLocalPref } from '../../../hooks/useLocalPref';
import { usePayees } from '../../../hooks/usePayees';
import { styles } from '../../../style/index';
import { theme } from '../../../style/theme';
import { Block } from '../../common/Block';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { DateRange } from '../DateRange';
import { ReportCard } from '../ReportCard';

import { GetCardData } from './GetCardData';
import { ListCardsPopover } from './ListCardsPopover';

function index(data: CustomReportEntity[]): { [key: string]: boolean }[] {
  return data.reduce((carry, report) => {
    const reportId: string = report.id === undefined ? '' : report.id;

    return {
      ...carry,
      [reportId]: false,
    };
  }, []);
}

export function CustomReportListCards({
  report,
}: {
  report: CustomReportEntity;
}) {
  const result: { [key: string]: boolean }[] = index([report]);
  const [reportMenu, setReportMenu] = useState(result);
  const [deleteMenuOpen, setDeleteMenuOpen] = useState(result);
  const [nameMenuOpen, setNameMenuOpen] = useState(result);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [earliestTransaction, setEarliestTransaction] = useState('');

  const payees = usePayees();
  const accounts = useAccounts();
  const categories = useCategories();
  const [_firstDayOfWeekIdx] = useLocalPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';

  const [isCardHovered, setIsCardHovered] = useState('');

  const onDelete = async (reportData: string) => {
    setName('');
    await send('report/delete', reportData);
    onDeleteMenuOpen(reportData === undefined ? '' : reportData, false);
  };

  useEffect(() => {
    async function run() {
      const trans = await send('get-earliest-transaction');
      setEarliestTransaction(trans ? trans.date : monthUtils.currentDay());
    }
    run();
  }, []);

  const onAddUpdate = async ({
    reportData,
  }: {
    reportData?: CustomReportEntity;
  }) => {
    if (!reportData) {
      return null;
    }

    const updatedReport = {
      ...reportData,
      name,
    };

    const response = await sendCatch('report/update', updatedReport);

    if (response.error) {
      setErr(response.error.message);
      onNameMenuOpen(reportData.id === undefined ? '' : reportData.id, true);
      return;
    }

    onNameMenuOpen(reportData.id === undefined ? '' : reportData.id, false);
  };

  const onMenuSelect = async (item: string, report: CustomReportEntity) => {
    if (item === 'delete') {
      onMenuOpen(report.id, false);
      onDeleteMenuOpen(report.id, true);
      setErr('');
    }
    if (item === 'rename') {
      onMenuOpen(report.id, false);
      onNameMenuOpen(report.id, true);
      setName(report.name);
      setErr('');
    }
  };

  const onMenuOpen = (item: string, state: boolean) => {
    setReportMenu({ ...reportMenu, [item]: state });
  };

  const onDeleteMenuOpen = (item: string, state: boolean) => {
    setDeleteMenuOpen({ ...deleteMenuOpen, [item]: state });
  };

  const onNameMenuOpen = (item: string, state: boolean) => {
    setNameMenuOpen({ ...nameMenuOpen, [item]: state });
  };

  return (
    <>
      <ReportCard to="/reports/custom" report={report}>
        <View
          style={{ flex: 1, padding: 10 }}
          onMouseEnter={() =>
            setIsCardHovered(report.id === undefined ? '' : report.id)
          }
          onMouseLeave={() => {
            setIsCardHovered('');
            onMenuOpen(report.id === undefined ? '' : report.id, false);
          }}
        >
          <View
            style={{
              flexShrink: 0,
              paddingBottom: 5,
            }}
          >
            <View style={{ flex: 1 }}>
              <Block
                style={{
                  ...styles.mediumText,
                  fontWeight: 500,
                  marginBottom: 5,
                }}
                role="heading"
              >
                {report.name}
              </Block>
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
          />
        </View>
      </ReportCard>
      <View
        style={{
          textAlign: 'right',
          position: 'absolute',
          right: 10,
          top: 10,
        }}
      >
        <ListCardsPopover
          report={report}
          onMenuOpen={onMenuOpen}
          isCardHovered={isCardHovered}
          reportMenu={reportMenu}
          onMenuSelect={onMenuSelect}
          nameMenuOpen={nameMenuOpen}
          name={name}
          setName={setName}
          onAddUpdate={onAddUpdate}
          err={err}
          onNameMenuOpen={onNameMenuOpen}
          deleteMenuOpen={deleteMenuOpen}
          onDeleteMenuOpen={onDeleteMenuOpen}
          onDelete={onDelete}
        />
      </View>
    </>
  );
}
