import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/client/actions';
import { type ActualPluginStored } from 'loot-core/types/models/actual-plugin-stored';

import { theme } from '../../style';
import { useActualPlugins } from '../ActualPluginsProvider';
import { Button } from '../common/Button2';
import { Link } from '../common/Link';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { Cell, Row } from '../table';

import { PluginsHeader } from './PluginsHeader';
import { SimpleTable } from '../common/SimpleTable';

export function ManagePlugins() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <View
          style={{
            color: theme.pageTextLight,
            flexDirection: 'row',
            alignItems: 'center',
            width: '50%',
          }}
        >
          <Text>
            {t(
              'Manage and configure plugins to enhance functionality and efficiency.',
            )}{' '}
            <Link
              variant="external"
              to="https://actualbudget.org/docs/experimental/plugins/"
              linkColor="muted"
            >
              {t('Learn more')}
            </Link>
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        {/* <Search
            placeholder={t('Filter rules...')}
            value={filter}
            onChange={onSearchChange}
          /> */}
      </View>
      <View style={{ flex: 1, paddingTop: 16 }}>
        <PluginsHeader />
        <SimpleTable
          loadMore={() => {}}
          // Hide the last border of the item in the table
          style={{ marginBottom: -1 }}
        >
          <div />
          <PluginList />
          {/* {filteredRules.length === 0 ? (
              <EmptyMessage text={t('No rules')} style={{ marginTop: 15 }} />
            ) : (
              <RulesList
                rules={filteredRules}
                selectedItems={selectedInst.items}
                hoveredRule={hoveredRule}
                onHover={onHover}
                onEditRule={onEditRule}
                onDeleteRule={rule => onDeleteRule(rule.id)}
              />
            )} */}
        </SimpleTable>
      </View>
      <View
        style={{
          paddingBlock: 15,
          flexShrink: 0,
        }}
      >
        <Stack direction="row" align="center" justify="flex-end" spacing={2}>
          {/* {selectedInst.items.size > 0 && (
              <Button onPress={onDeleteSelected}>
                Delete {selectedInst.items.size} plugins
              </Button>
            )} */}
          <Button
            variant="primary"
            onPress={() =>
              dispatch(
                pushModal('select-new-plugin', {
                  onSave: async () => {},
                }),
              )
            }
          >
            {t('Add new plugin')}
          </Button>
        </Stack>
      </View>
    </View>
  );
}

function PluginList() {
  const { pluginStore, plugins } = useActualPlugins();
  return (
    <>
      {pluginStore.map(plugin => (
        <PluginRow
          key={`${plugin.name}-${plugin.version}`}
          plugin={plugin}
          enabled={plugins.some(p => p.name === plugin.name)}
        />
      ))}
    </>
  );
}

type PluginRowProps = {
  plugin: ActualPluginStored;
  enabled: boolean;
};
function PluginRow({ plugin, enabled }: PluginRowProps) {
  return (
    <Row
      height="auto"
      style={{
        fontSize: 13,
        backgroundColor: theme.tableBackground,
      }}
      collapsed={true}
    >
      <Cell name="name" width={180} plain style={{ color: theme.tableText }}>
        <View
          style={{
            alignSelf: 'flex-start',
            margin: 5,
            borderRadius: 4,
            padding: '3px 5px',
          }}
        >
          {plugin.name}
        </View>
      </Cell>
      <Cell name="version" width={80} plain style={{ color: theme.tableText }}>
        <View
          style={{
            alignSelf: 'flex-start',
            margin: 5,
            borderRadius: 4,
            padding: '3px 5px',
          }}
        >
          {plugin.version}
        </View>
      </Cell>
      <Cell name="url" width="flex" plain style={{ color: theme.tableText }}>
        <View
          style={{
            alignSelf: 'flex-start',
            margin: 5,
            borderRadius: 4,
            padding: '3px 5px',
          }}
        >
          {plugin.url}
        </View>
      </Cell>
      <Cell name="state" width={100} plain style={{ color: theme.tableText }}>
        <View
          style={{
            alignSelf: 'flex-start',
            margin: 5,
            borderRadius: 4,
            padding: '3px 5px',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {enabled ? 'Running' : ''}
        </View>
      </Cell>
      <Cell
        name="description"
        width="flex"
        plain
        style={{ color: theme.tableText }}
      >
        <View
          style={{
            alignSelf: 'flex-start',
            margin: 5,
            borderRadius: 4,
            padding: '3px 5px',
          }}
        >
          {plugin.description}
        </View>
      </Cell>
      <Cell name="actions" width={100} plain style={{ color: theme.tableText }}>
        <View
          style={{
            alignSelf: 'flex-start',
            margin: 5,
            borderRadius: 4,
            padding: '3px 5px',
          }}
        />
      </Cell>
    </Row>
  );
}
