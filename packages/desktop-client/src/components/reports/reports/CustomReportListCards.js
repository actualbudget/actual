import React, { Children, useState } from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

import { styles } from '../../../style';
import Block from '../../common/Block';
import Menu from '../../common/Menu';
import MenuButton from '../../common/MenuButton';
import MenuTooltip from '../../common/MenuTooltip';
import View from '../../common/View';
import { ChooseGraph } from '../ChooseGraph';
import Convert from '../Convert';
import DateRange from '../DateRange';
import { LoadingIndicator } from '../Overview';
import ReportCard from '../ReportCard';

function CardMenu({ onClose, onMenuSelect, reportId }) {
  return (
    <MenuTooltip onClose={onClose}>
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
  const result = {};
  data.forEach(report => {
    result[report.id] = false;
  });
  return result;
}

export default function CustomReportListCards({ reports }) {
  let result = index(reports);
  let [reportMenu, setReportMenu] = useState(result);

  const [isCardHovered, setIsCardHovered] = useState(null);

  const onMenuSelect = async (item, reportId) => {
    if (item === 'delete') {
      onMenuOpen(reportId, false);
      await send('report-delete', reportId);
    }
  };

  const onMenuOpen = (item, state) => {
    setReportMenu({ ...reportMenu, [item]: state });
  };

  const ReportGrid = slice => {
    const pack = [];

    slice?.map((item, i) => {
      pack.push(<Children data={item} />);
      return null;
    });

    const data2 = [...pack];
    const remainder = 3 - (data2.length % 3);
    const groupedData = [];

    while (data2.length) {
      groupedData.push(data2.splice(0, 3));
    }

    return (
      <>
        {groupedData.map((data, i) => (
          <View
            key={i}
            style={{
              flex: '0 0 auto',
              flexDirection: 'row',
            }}
          >
            {data.map((report, id) => (
              <View key={id} style={{ position: 'relative', flex: '1' }}>
                <View style={{ width: '100%', height: '100%' }}>
                  <ReportCard to="/reports/custom" report={report.props.data}>
                    <View
                      style={{ flex: 1, padding: 20 }}
                      onMouseEnter={() =>
                        setIsCardHovered(report.props.data.id)
                      }
                      onMouseLeave={() => {
                        setIsCardHovered(null);
                        onMenuOpen(report.props.data.id, false);
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
                            {report.props.data.name}
                          </Block>
                          <DateRange
                            start={report.props.data.start}
                            end={report.props.data.end}
                          />
                        </View>
                      </View>

                      {report.props.data.data ? (
                        <ChooseGraph
                          graphType={report.props.data.graphType}
                          start={report.props.data.start}
                          end={report.props.data.end}
                          data={report.props.data.data}
                          compact={true}
                          groupBy={report.props.data.groupBy}
                          empty={Convert(report.props.data.empty)}
                          balanceType={report.props.data.balanceType}
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
                    onClick={() => onMenuOpen(report.props.data.id, true)}
                    style={{
                      color:
                        isCardHovered === report.props.data.id
                          ? 'inherit'
                          : 'transparent',
                    }}
                  />
                  {reportMenu[report.props.data.id] && (
                    <CardMenu
                      onMenuSelect={onMenuSelect}
                      onClose={() => onMenuOpen(report.props.data.id, false)}
                      reportId={report.props.data.id}
                    />
                  )}
                </View>
              </View>
            ))}
            {remainder !== 3 &&
              i + 1 === groupedData.length &&
              [...Array(remainder)].map((e, i) => (
                <View key={i} style={{ flex: 1 }} />
              ))}
          </View>
        ))}
      </>
    );
  };

  return reports.length > 0 && ReportGrid(reports);
}
