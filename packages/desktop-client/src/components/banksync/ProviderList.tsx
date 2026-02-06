import React, { useMemo } from 'react';
import { Dialog, DialogTrigger } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { Menu, type MenuItem } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  getInternalBankSyncProviders,
  type InternalBankSyncProvider,
  type ProviderStatusMap,
} from './useProviderStatusMap';

import { Cell, Row, TableHeader } from '@desktop-client/components/table';

type ProviderListProps = {
  statusMap: ProviderStatusMap;
  canConfigure?: boolean;
  onConfigure: (provider: InternalBankSyncProvider) => void;
  onReset: (provider: InternalBankSyncProvider) => void;
};

export function ProviderList({
  statusMap,
  canConfigure = true,
  onConfigure,
  onReset,
}: ProviderListProps) {
  const { t } = useTranslation();
  const providers = useMemo(() => getInternalBankSyncProviders(), []);

  const configuredProviders = useMemo(
    () => providers.filter(p => Boolean(statusMap[p.slug]?.configured)),
    [providers, statusMap],
  );

  const unconfiguredProviders = useMemo(
    () => providers.filter(p => !statusMap[p.slug]?.configured),
    [providers, statusMap],
  );

  const addProviderItems: MenuItem<string>[] = useMemo(
    () =>
      unconfiguredProviders.map(p => ({
        name: p.slug,
        text: p.displayName,
      })),
    [unconfiguredProviders],
  );

  return (
    <View style={{ display: 'flex', flexDirection: 'column' }}>
      {unconfiguredProviders.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <DialogTrigger>
            <Button
              variant="bare"
              isDisabled={!canConfigure}
              style={{ padding: 0 }}
            >
              <SvgAdd width={10} height={10} style={{ marginRight: 3 }} />
              <Trans>Add Provider</Trans>
            </Button>
            <Popover>
              <Dialog>
                {({ close }) => (
                  <Menu
                    items={addProviderItems}
                    onMenuSelect={itemId => {
                      const provider = providers.find(
                        p => p.slug === String(itemId),
                      );
                      if (provider) {
                        onConfigure(provider);
                        close();
                      }
                    }}
                  />
                )}
              </Dialog>
            </Popover>
          </DialogTrigger>
        </View>
      )}
      <View style={styles.tableContainer}>
        <TableHeader style={{ paddingLeft: 10 }}>
          <Cell
            value={t('Provider')}
            width={300}
          />
          <Cell
            value={t('Encrypted')}
            width={100}
          />
          <Cell value="" width="flex" />
        </TableHeader>
        {configuredProviders.length === 0 ? (
          <View
            style={{
              ...styles.smallText,
              color: theme.pageTextSubdued,
              fontStyle: 'italic',
              backgroundColor: theme.tableBackground,
              padding: 10,
              borderTop: `1px solid ${theme.tableBorder}`,
            }}
          >
            <Trans>No providers enabled</Trans>
          </View>
        ) : (
          configuredProviders.map(provider => (
            <Row
              key={provider.slug}
              height="auto"
              style={{
                fontSize: 13,
                height: 40,
                paddingLeft: 10,
                backgroundColor: theme.tableBackground,
              }}
              collapsed
            >
              <Cell
                name="providerName"
                width={300}
                plain
                style={{ color: theme.tableText}}
              >
                {provider.displayName}
              </Cell>
              <Cell
                name="encrypted"
                width={100}
                plain
                style={{
                  color: theme.tableText,
                }}
              >
                {statusMap[provider.slug]?.encrypted
                  ? t('Yes')
                  : t('No')}
              </Cell>
              <Cell name="reset" plain style={{ paddingRight:10, justifyContent: 'flex-end', flexDirection: 'row' }} width="flex">
                <Button
                  variant="normal"
                  isDisabled={!canConfigure}
                  onPress={() => onReset(provider)}
                >
                  <Trans>Reset</Trans>
                </Button>
              </Cell>
            </Row>
          ))
        )}
      </View>
    </View>
  );
}
