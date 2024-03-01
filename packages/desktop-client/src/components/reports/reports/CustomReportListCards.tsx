import React, { createRef, useMemo, useState } from 'react';

import { send, sendCatch } from 'loot-core/platform/client/fetch/index';
import { type CustomReportEntity } from 'loot-core/types/models/reports';

import { styles } from '../../../style';
import { theme } from '../../../style/theme';
import { Block } from '../../common/Block';
import { Menu } from '../../common/Menu';
import { MenuButton } from '../../common/MenuButton';
import { MenuTooltip } from '../../common/MenuTooltip';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { ChooseGraph } from '../ChooseGraph';
import { DateRange } from '../DateRange';
import { LoadingIndicator } from '../LoadingIndicator';
import { ReportCard } from '../ReportCard';
import { SaveReportName } from '../SaveReportName';

type CardMenuProps = {
  onClose: () => void;
  onMenuSelect: (item: string, report: CustomReportEntity) => void;
  report: CustomReportEntity;
};

function CardMenu({ onClose, onMenuSelect, report }: CardMenuProps) {
  return (
    <MenuTooltip onClose={onClose} width={120}>
      <Menu
        onMenuSelect={item => {
          onMenuSelect(item, report);
        }}
        items={[
          {
            name: 'rename',
            text: 'Rename report',
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
  reports,
}: {
  reports: CustomReportEntity[];
}) {
  const result: { [key: string]: boolean }[] = index(reports);
  const [reportMenu, setReportMenu] = useState(result);
  const [nameMenuOpen, setNameMenuOpen] = useState(result);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const inputRef = createRef<HTMLInputElement>();

  const [isCardHovered, setIsCardHovered] = useState('');

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
      await send('report/delete', report.id);
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

  const onNameMenuOpen = (item: string, state: boolean) => {
    setNameMenuOpen({ ...nameMenuOpen, [item]: state });
  };

  const chunkSize = 3;

  const groups = useMemo(() => {
    return reports
      .map((report: CustomReportEntity, i: number) => {
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
          {group &&
            group.map((report, id) => (
              <View key={id} style={{ position: 'relative', flex: '1' }}>
                <View style={{ width: '100%', height: '100%' }}>
                  <ReportCard to="/reports/custom" report={report}>
                    <View
                      style={{ flex: 1, padding: 10 }}
                      onMouseEnter={() =>
                        setIsCardHovered(
                          report.id === undefined ? '' : report.id,
                        )
                      }
                      onMouseLeave={() => {
                        setIsCardHovered('');
                        onMenuOpen(
                          report.id === undefined ? '' : report.id,
                          false,
                        );
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
                          {report.isDateStatic ? (
                            <DateRange
                              start={report.startDate}
                              end={report.endDate}
                            />
                          ) : (
                            <Text style={{ color: theme.pageTextSubdued }}>
                              {report.dateRange}
                            </Text>
                          )}
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
                          interval={report.interval}
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
                    onClick={() =>
                      onMenuOpen(report.id === undefined ? '' : report.id, true)
                    }
                    style={{
                      color:
                        isCardHovered === report.id ? 'inherit' : 'transparent',
                    }}
                  />
                  {report.id === undefined
                    ? null
                    : reportMenu[report.id as keyof typeof reportMenu] && (
                        <CardMenu
                          onMenuSelect={onMenuSelect}
                          onClose={() =>
                            onMenuOpen(
                              report.id === undefined ? '' : report.id,
                              false,
                            )
                          }
                          report={report}
                        />
                      )}
                  {report.id === undefined
                    ? null
                    : nameMenuOpen[report.id as keyof typeof nameMenuOpen] && (
                        <SaveReportName
                          onClose={() =>
                            onNameMenuOpen(
                              report.id === undefined ? '' : report.id,
                              false,
                            )
                          }
                          menuItem="rename"
                          name={name}
                          setName={setName}
                          inputRef={inputRef}
                          onAddUpdate={onAddUpdate}
                          err={err}
                          report={report}
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
