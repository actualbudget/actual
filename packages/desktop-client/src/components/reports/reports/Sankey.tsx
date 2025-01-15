import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import * as d from 'date-fns';

import { addNotification } from 'loot-core/client/actions';
import { useWidget } from 'loot-core/client/data-hooks/widget';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { type TimeFrame, type SankeyWidget } from 'loot-core/types/models';

import { useCategories } from '../../../hooks/useCategories';
import { useFilters } from '../../../hooks/useFilters';
import { useNavigate } from '../../../hooks/useNavigate';
import { useDispatch } from '../../../redux';
import { theme, styles } from '../../../style';
import { Button } from '../../common/Button2';
import { Paragraph } from '../../common/Paragraph';
import { View } from '../../common/View';
import { EditablePageHeaderTitle } from '../../EditablePageHeaderTitle';
import { MobileBackButton } from '../../mobile/MobileBackButton';
import { MobilePageHeader, Page, PageHeader } from '../../Page';
import { useResponsive } from '../../responsive/ResponsiveProvider';
import { SankeyGraph } from '../graphs/SankeyGraph';
import { Header } from '../Header';
import { LoadingIndicator } from '../LoadingIndicator';
import { calculateTimeRange } from '../reportRanges';
import { createSpreadsheet as sankeySpreadsheet } from '../spreadsheets/sankey-spreadsheet';
import { useReport } from '../useReport';
import { fromDateRepr } from '../util';

export function Sankey() {
  const params = useParams();
  const { data: widget, isLoading } = useWidget<SankeyWidget>(
    params.id ?? '',
    'sankey-card',
  );

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return <SankeyInner widget={widget} />;
}

type SankeyInnerProps = {
  widget?: SankeyWidget;
};
function SankeyInner({ widget }: SankeyInnerProps) {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();

  const { grouped: categoryGroups } = useCategories();
  const {
    conditions,
    conditionsOp,
    onApply: onApplyFilter,
    onDelete: onDeleteFilter,
    onUpdate: onUpdateFilter,
    onConditionsOpChange,
  } = useFilters(widget?.meta?.conditions, widget?.meta?.conditionsOp);

  const [allMonths, setAllMonths] = useState<Array<{
    name: string;
    pretty: string;
  }> | null>(null);
  const [initialStart, initialEnd, initialMode] = calculateTimeRange(
    widget?.meta?.timeFrame,
  );
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [mode, setMode] = useState(initialMode);

  const reportParams = useMemo(
    () =>
      sankeySpreadsheet(start, end, categoryGroups, conditions, conditionsOp),
    [start, end, categoryGroups, conditions, conditionsOp],
  );
  const data = useReport('sankey', reportParams);
  useEffect(() => {
    async function run() {
      const trans = await send('get-earliest-transaction');
      const currentMonth = monthUtils.currentMonth();
      let earliestMonth = trans
        ? monthUtils.monthFromDate(d.parseISO(fromDateRepr(trans.date)))
        : currentMonth;

      // Make sure the month selects are at least populates with a
      // year's worth of months. We can undo this when we have fancier
      // date selects.
      const yearAgo = monthUtils.subMonths(monthUtils.currentMonth(), 12);
      if (earliestMonth > yearAgo) {
        earliestMonth = yearAgo;
      }

      const allMonths = monthUtils
        .rangeInclusive(earliestMonth, monthUtils.currentMonth())
        .map(month => ({
          name: month,
          pretty: monthUtils.format(month, 'MMMM, yyyy'),
        }))
        .reverse();

      setAllMonths(allMonths);
    }
    run();
  }, []);

  function onChangeDates(start: string, end: string, mode: TimeFrame['mode']) {
    setStart(start);
    setEnd(end);
    setMode(mode);
  }

  async function onSaveWidget() {
    if (!widget) {
      throw new Error('No widget that could be saved.');
    }

    await send('dashboard-update-widget', {
      id: widget.id,
      meta: {
        ...(widget.meta ?? {}),
        conditions,
        conditionsOp,
        timeFrame: {
          start,
          end,
          mode,
        },
      },
    });
    dispatch(
      addNotification({
        type: 'message',
        message: t('Dashboard widget successfully saved.'),
      }),
    );
  }

  const onSaveWidgetName = async (newName: string) => {
    if (!widget) {
      throw new Error('No widget that could be saved.');
    }

    const name = newName || t('Sankey');
    await send('dashboard-update-widget', {
      id: widget.id,
      meta: {
        ...(widget.meta ?? {}),
        name,
      },
    });
  };

  const title = widget?.meta?.name || t('Sankey');

  if (!allMonths || !data) {
    return null;
  }

  return (
    <Page
      header={
        isNarrowWidth ? (
          <MobilePageHeader
            title={title}
            leftContent={
              <MobileBackButton onPress={() => navigate('/reports')} />
            }
          />
        ) : (
          <PageHeader
            title={
              widget ? (
                <EditablePageHeaderTitle
                  title={title}
                  onSave={onSaveWidgetName}
                />
              ) : (
                title
              )
            }
          />
        )
      }
      padding={0}
    >
      <Header
        allMonths={allMonths}
        start={start}
        end={end}
        mode={mode}
        onChangeDates={onChangeDates}
        filters={conditions}
        onApply={onApplyFilter}
        onUpdateFilter={onUpdateFilter}
        onDeleteFilter={onDeleteFilter}
        conditionsOp={conditionsOp}
        onConditionsOpChange={onConditionsOpChange}
      >
        {widget && (
          <Button variant="primary" onPress={onSaveWidget}>
            {t('Save widget')}
          </Button>
        )}
      </Header>

      <View
        style={{
          backgroundColor: theme.tableBackground,
          padding: 30,
          paddingTop: 0,
          overflow: 'auto',
          flex: '1 0 auto',
        }}
      >
        <View
          style={{
            textAlign: 'right',
            paddingTop: 20,
            paddingRight: 20,
            flexShrink: 0,
          }}
        >
          <View
            style={{ ...styles.largeText, fontWeight: 400, marginBottom: 5 }}
          />
        </View>

        <SankeyGraph style={{ flexGrow: 1 }} data={data} />

        <View style={{ marginTop: 30 }}>
          <Paragraph>
            <strong>What is a Sankey plot?</strong>
          </Paragraph>
          <Paragraph>
            A Sankey plot visualizes the flow of quantities between multiple
            categories, emphasizing the distribution and proportional
            relationships of data streams. If you hover over the graph, you can
            see detailed flow values between categories.
          </Paragraph>
        </View>
      </View>
    </Page>
  );
}
