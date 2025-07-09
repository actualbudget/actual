import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Paragraph } from '@actual-app/components/paragraph';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import { type NetWorthWidget } from 'loot-core/types/models';

import { NetWorthComponent } from './NetWorthComponent';

import { EditablePageHeaderTitle } from '@desktop-client/components/EditablePageHeaderTitle';
import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import {
  MobilePageHeader,
  Page,
  PageHeader,
} from '@desktop-client/components/Page';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useWidget } from '@desktop-client/hooks/useWidget';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

export function NetWorth() {
  const params = useParams();
  const { data: widget, isLoading } = useWidget<NetWorthWidget>(
    params.id ?? '',
    'net-worth-card',
  );

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return <NetWorthInner widget={widget} />;
}

type NetWorthInnerProps = {
  widget?: NetWorthWidget;
};

function NetWorthInner({ widget }: NetWorthInnerProps) {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const accounts = useAccounts();

  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();

  const title = widget?.meta?.name || t('Net Worth');
  const onSaveWidgetName = async (newName: string) => {
    if (!widget) {
      throw new Error('No widget that could be saved.');
    }

    const name = newName || t('Net Worth');
    await send('dashboard-update-widget', {
      id: widget.id,
      meta: {
        ...(widget.meta ?? {}),
        name,
      },
    });
  };

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
      <NetWorthComponent
        accounts={accounts}
        filterConditions={widget?.meta?.conditions}
        filterConditionsOp={widget?.meta?.conditionsOp}
        initialTimeFrame={widget?.meta?.timeFrame}
      >
        {newFilter => {
          if (widget) {
            return (
              <Button
                variant="primary"
                onPress={async () => {
                  await send('dashboard-update-widget', {
                    id: widget.id,
                    meta: {
                      ...(widget.meta ?? {}),
                      ...newFilter,
                    },
                  });
                  dispatch(
                    addNotification({
                      notification: {
                        type: 'message',
                        message: t('Dashboard widget successfully saved.'),
                      },
                    }),
                  );
                }}
              >
                <Trans>Save widget</Trans>
              </Button>
            );
          }
        }}
      </NetWorthComponent>

      <View
        style={{
          backgroundColor: theme.tableBackground,
          padding: 20,
          paddingTop: 0,
          flex: '1 0 auto',
          overflowY: 'auto',
        }}
      >
        <View style={{ marginTop: 30, userSelect: 'none' }}>
          <Paragraph>
            <strong>
              <Trans>How is net worth calculated?</Trans>
            </strong>
          </Paragraph>
          <Paragraph>
            <Trans>
              Net worth shows the balance of all accounts over time, including
              all of your investments. Your “net worth” is considered to be the
              amount you’d have if you sold all your assets and paid off as much
              debt as possible. If you hover over the graph, you can also see
              the amount of assets and debt individually.
            </Trans>
          </Paragraph>
        </View>
      </View>
    </Page>
  );
}
