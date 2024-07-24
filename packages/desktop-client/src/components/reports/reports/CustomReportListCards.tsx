import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { send, sendCatch } from 'loot-core/platform/client/fetch/index';
import { addNotification } from 'loot-core/src/client/actions';
import * as monthUtils from 'loot-core/src/shared/months';
import { type CustomReportEntity } from 'loot-core/types/models/reports';

import { useAccounts } from '../../../hooks/useAccounts';
import { useCategories } from '../../../hooks/useCategories';
import { useLocalPref } from '../../../hooks/useLocalPref';
import { usePayees } from '../../../hooks/usePayees';
import { styles } from '../../../style/index';
import { theme } from '../../../style/theme';
import { Block } from '../../common/Block';
import { InitialFocus } from '../../common/InitialFocus';
import { Input } from '../../common/Input';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { DateRange } from '../DateRange';
import { ReportCard } from '../ReportCard';

import { GetCardData } from './GetCardData';

export function CustomReportListCards({
  isEditing,
  report,
  onRemove,
}: {
  isEditing?: boolean;
  report: CustomReportEntity;
  onRemove: () => void;
}) {
  const dispatch = useDispatch();

  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const [earliestTransaction, setEarliestTransaction] = useState('');

  const payees = usePayees();
  const accounts = useAccounts();
  const categories = useCategories();
  const [_firstDayOfWeekIdx] = useLocalPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';

  const onDelete = async () => {
    await send('report/delete', report.id);
  };

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
      to="/reports/custom"
      report={report}
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
            onDelete();
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
            {nameMenuOpen ? (
              <InitialFocus>
                <Input
                  defaultValue={report.name}
                  onEnter={e =>
                    onSaveName((e.target as HTMLInputElement).value)
                  }
                  onBlur={e => onSaveName(e.target.value)}
                  onEscape={() => setNameMenuOpen(false)}
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    marginTop: -6,
                    marginBottom: -1,
                    marginLeft: -6,
                    width: Math.max(20, report.name.length) + 'ch',
                  }}
                />
              </InitialFocus>
            ) : (
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
            )}
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
  );
}
