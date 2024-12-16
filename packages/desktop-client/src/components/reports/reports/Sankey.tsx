import { useParams } from 'react-router-dom';
import { LoadingIndicator } from '../LoadingIndicator';
import { useWidget } from 'loot-core/client/data-hooks/widget';
import { MobilePageHeader, Page, PageHeader } from '../../Page';
import { MobileBackButton } from '../../mobile/MobileBackButton';
import { EditablePageHeaderTitle } from '../../EditablePageHeaderTitle';
import { t } from 'i18next';
import { useResponsive } from '../../responsive/ResponsiveProvider';
import { useNavigate } from '../../../hooks/useNavigate';
import { send } from 'loot-core/platform/client/fetch';
import {
  RuleConditionEntity,
  SankeyWidget,
  TimeFrame,
} from 'loot-core/types/models';
import { Header } from '../Header';
import { useMemo, useState } from 'react';
import { calculateTimeRange } from '../reportRanges';
import { useReport } from '../useReport';
import { createSpreadsheet as sankeySpreadsheet } from '../spreadsheets/Sankey-spreadsheet';
import { useFilters } from '../../../hooks/useFilters';
import { Trans } from 'react-i18next';
import { Button } from '../../common/Button2';
import { addNotification } from 'loot-core/client/actions/notifications';
import { useDispatch } from 'react-redux';
import { View } from '../../common/View';
import { theme } from '../../../style/theme';
import { SankeyGraph } from '../graphs/SankeyGraph';
import { useAccounts } from '../../../hooks/useAccounts';

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
  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();

  const title = widget?.meta?.name || t('Sankey');
  const [initialStart, initialEnd, initialMode] = calculateTimeRange(
    widget?.meta?.timeFrame,
  );
  const [allMonths, setAllMonths] = useState<
    Array<{
      name: string;
      pretty: string;
    }>
  >([]);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [mode, setMode] = useState(initialMode);

  const accounts = useAccounts();
  const {
    conditions,
    conditionsOp,
    onApply: onApplyFilter,
    onDelete: onDeleteFilter,
    onUpdate: onUpdateFilter,
    onConditionsOpChange,
  } = useFilters(widget?.meta?.conditions, widget?.meta?.conditionsOp);

  const reportParams = useMemo(
    () => sankeySpreadsheet(start, end, accounts, conditions, conditionsOp),
    [start, end, accounts, conditions, conditionsOp],
  );

  function onChangeDates(start: string, end: string, mode: TimeFrame['mode']) {
    setStart(start);
    setEnd(end);
    setMode(mode);
  }

  const data = useReport('Sankey', reportParams);

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
        start={start}
        end={end}
        allMonths={allMonths}
        onChangeDates={onChangeDates}
        conditionsOp={conditionsOp}
        onUpdateFilter={onUpdateFilter}
        onDeleteFilter={onDeleteFilter}
        onConditionsOpChange={onConditionsOpChange}
      >
        {widget && (
          <Button variant="primary" onPress={onSaveWidget}>
            <Trans>Save widget</Trans>
          </Button>
        )}
      </Header>

      <View
        style={{
          backgroundColor: theme.tableBackground,
          padding: 20,
          paddingTop: 0,
          flex: '1 0 auto',
          overflowY: 'auto',
        }}
      >
        <View
          style={{
            textAlign: 'right',
            paddingTop: 20,
          }}
        >
          <SankeyGraph
            graphData={data ? data.graphData : undefined}
            showTooltip={!isNarrowWidth}
          />
        </View>
      </View>
    </Page>
  );
}
