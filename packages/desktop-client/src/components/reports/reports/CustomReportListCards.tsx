// @ts-strict-ignore
import React, { useMemo, useState } from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

import { styles } from '../../../style';
import { Block } from '../../common/Block';
import { Menu } from '../../common/Menu';
import { MenuButton } from '../../common/MenuButton';
import { MenuTooltip } from '../../common/MenuTooltip';
import { View } from '../../common/View';
import { ChooseGraph } from '../ChooseGraph';
import { DateRange } from '../DateRange';
import { LoadingIndicator } from '../LoadingIndicator';
import { ReportCard } from '../ReportCard';

type CardMenuProps = {
  onClose: () => void;
  onMenuSelect: (item: string, reportId: string) => void;
  reportId: string;
};

function CardMenu({ onClose, onMenuSelect, reportId }: CardMenuProps) {
  return (
    <MenuTooltip onClose={onClose} width={120}>
      <Menu
        onMenuSelect={item => {
          onMenuSelect(item, reportId);
        }}
        items={[
          {
            name: 'rename',
            text: 'Rename report',
            disabled: true,
          },
          {
            name: 'delete',
            text: 'Delete report',
          },
        ]}
      />
    </MenuTooltip>
  );
}

function index(data) {
  return data.reduce((carry, report) => ({ ...carry, [report.id]: false }), []);
}

export function CustomReportListCards({ reports }) {
  const result = index(reports);
  const [reportMenu, setReportMenu] = useState(result);

  const [isCardHovered, setIsCardHovered] = useState(null);

  const onMenuSelect = async (item, reportId) => {
    if (item === 'delete') {
      onMenuOpen(reportId, false);
      await send('report/delete', reportId);
    }
  };

  const onMenuOpen = (item, state) => {
    setReportMenu({ ...reportMenu, [item]: state });
  };

  const chunkSize = 3;

  const groups = useMemo(() => {
    return reports
      .map((e, i) => {
        return i % chunkSize === 0 ? reports.slice(i, i + chunkSize) : null;
      })
      .filter(e => {
        return e;
      });
  }, [reports]);

  const remainder = 3 - (reports.length % 3);

  if (reports.length === 0) return null;
  return (
    <View>
      {groups.map((group, i) => (
        <View
          key={i}
          style={{
            flex: '0 0 auto',
            flexDirection: 'row',
          }}
        >
          {group.map((report, id) => (
            <View key={id} style={{ position: 'relative', flex: '1' }}>
              <View style={{ width: '100%', height: '100%' }}>
                <ReportCard to="/reports/custom" report={report}>
                  <View
                    style={{ flex: 1, padding: 10 }}
                    onMouseEnter={() => setIsCardHovered(report.id)}
                    onMouseLeave={() => {
                      setIsCardHovered(null);
                      onMenuOpen(report.id, false);
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
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
                        <DateRange
                          start={report.startDate}
                          end={report.endDate}
                        />
                      </View>
                    </View>

                    {report.data ? (
                      <ChooseGraph
                        startDate={report.startDate}
                        endDate={report.endDate}
                        data={report.data}
                        mode={report.mode}
                        graphType={report.graphType}
                        balanceType={report.balanceType}
                        groupBy={report.groupBy}
                        compact={true}
                        style={{ height: 'auto', flex: 1 }}
                      />
                    ) : (
                      <LoadingIndicator />
                    )}
                  </View>
                </ReportCard>
              </View>
              <View
                style={{
                  textAlign: 'right',
                  position: 'absolute',
                  right: 25,
                  top: 25,
                }}
              >
                <MenuButton
                  onClick={() => onMenuOpen(report.id, true)}
                  style={{
                    color:
                      isCardHovered === report.id ? 'inherit' : 'transparent',
                  }}
                />
                {reportMenu[report.id] && (
                  <CardMenu
                    onMenuSelect={onMenuSelect}
                    onClose={() => onMenuOpen(report.id, false)}
                    reportId={report.id}
                  />
                )}
              </View>
            </View>
          ))}
          {remainder !== 3 &&
            i + 1 === groups.length &&
            [...Array(remainder)].map((e, i) => (
              <View key={i} style={{ flex: 1 }} />
            ))}
        </View>
      ))}
    </View>
  );
}
