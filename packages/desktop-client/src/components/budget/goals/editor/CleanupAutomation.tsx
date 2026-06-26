import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { Input } from '@actual-app/components/input';
import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type {
  CleanupConfig,
  GroupCleanup,
} from '#components/budget/goals/cleanupModel';
import { Link } from '#components/common/Link';
import { FormLabel } from '#components/forms';
import { LabeledCheckbox } from '#components/forms/LabeledCheckbox';
import type { CleanupGroup } from '#hooks/useCleanupGroups';

import { CleanupGroupPicker } from './CleanupGroupPicker';

type CleanupAutomationProps = {
  config: CleanupConfig;
  groups: CleanupGroup[];
  onChange: (next: CleanupConfig) => void;
  onCreateGroup: (name: string) => Promise<string>;
};

export function CleanupAutomation({
  config,
  groups,
  onChange,
  onCreateGroup,
}: CleanupAutomationProps) {
  const { t } = useTranslation();
  const [pickingGroup, setPickingGroup] = useState(false);

  const updateGlobal = (patch: Partial<CleanupConfig['global']>) =>
    onChange({ ...config, global: { ...config.global, ...patch } });

  const updateGroup = (groupId: string, patch: Partial<GroupCleanup>) =>
    onChange({
      ...config,
      groups: config.groups.map(group =>
        group.groupId === groupId ? { ...group, ...patch } : group,
      ),
    });

  const removeGroup = (groupId: string) =>
    onChange({
      ...config,
      groups: config.groups.filter(group => group.groupId !== groupId),
    });

  const addGroup = (groupId: string) => {
    if (config.groups.some(group => group.groupId === groupId)) return;
    onChange({
      ...config,
      groups: [
        ...config.groups,
        {
          groupId,
          send: false,
          take: false,
          weight: 1,
          overspendOnly: false,
        },
      ],
    });
  };

  return (
    <View style={{ gap: 14 }}>
      <Text style={{ fontSize: 12, color: theme.pageTextLight }}>
        <Trans>
          End of month cleanup is a one-click reallocation of funds. Categories
          you choose to <strong>send leftover</strong> return their surplus to a
          pool; categories you mark to <strong>receive leftover</strong> receive
          part or all of that pool back. By default, the pool is To Budget. You
          can also create named pools so the surplus only moves between
          categories set to use that pool.{' '}
          <Link
            variant="external"
            to="https://actualbudget.org/docs/experimental/monthly-cleanup#local-group-source-and-sinks"
          >
            Learn more
          </Link>
        </Trans>
      </Text>

      <ScopeCard
        title={t('Global')}
        sendLabel={t('Send leftover')}
        takeLabel={t('Receive leftover')}
        send={config.global.send}
        take={config.global.take}
        weight={config.global.weight}
        overspendOnly={false}
        showOverspendOnly={false}
        onChangeSend={send => updateGlobal({ send })}
        onChangeTake={take => updateGlobal({ take })}
        onChangeWeight={weight => updateGlobal({ weight })}
        onChangeOverspendOnly={() => undefined}
      />

      {config.groups.map(group => {
        const groupName =
          groups.find(g => g.id === group.groupId)?.name ?? t('Unknown pool');
        return (
          <ScopeCard
            key={group.groupId}
            title={t('Pool: {{groupName}}', { groupName })}
            sendLabel={t('Send leftover to pool')}
            takeLabel={t('Receive leftover from pool')}
            send={group.send}
            take={group.take}
            weight={group.weight}
            overspendOnly={group.overspendOnly}
            showOverspendOnly
            onChangeSend={send => updateGroup(group.groupId, { send })}
            onChangeTake={take => updateGroup(group.groupId, { take })}
            onChangeWeight={weight => updateGroup(group.groupId, { weight })}
            onChangeOverspendOnly={overspendOnly =>
              updateGroup(group.groupId, { overspendOnly })
            }
            onRemove={() => removeGroup(group.groupId)}
          />
        );
      })}

      {/* The engine accepts multiple pool scopes per category but the result
          depends on category sort order, so the editor caps it at one. */}
      {config.groups.length === 0 &&
        (pickingGroup ? (
          <View style={{ gap: 6 }}>
            <FormLabel
              title={t('Pick or create a pool')}
              htmlFor="cleanup-add-group-field"
            />
            <CleanupGroupPicker
              id="cleanup-add-group-field"
              groups={groups}
              autoFocus
              onSelect={groupId => {
                addGroup(groupId);
                setPickingGroup(false);
              }}
              onCreate={onCreateGroup}
            />
          </View>
        ) : (
          <Button
            variant="bare"
            onPress={() => setPickingGroup(true)}
            style={{ alignSelf: 'flex-start', color: theme.pageTextPositive }}
          >
            + <Trans>Add to a pool</Trans>
          </Button>
        ))}
    </View>
  );
}

type ScopeCardProps = {
  title: string;
  sendLabel: string;
  takeLabel: string;
  send: boolean;
  take: boolean;
  weight: number;
  overspendOnly: boolean;
  showOverspendOnly: boolean;
  onChangeSend: (send: boolean) => void;
  onChangeTake: (take: boolean) => void;
  onChangeWeight: (weight: number) => void;
  onChangeOverspendOnly: (overspendOnly: boolean) => void;
  onRemove?: () => void;
};

function ScopeCard({
  title,
  sendLabel,
  takeLabel,
  send,
  take,
  weight,
  overspendOnly,
  showOverspendOnly,
  onChangeSend,
  onChangeTake,
  onChangeWeight,
  onChangeOverspendOnly,
  onRemove,
}: ScopeCardProps) {
  const { t } = useTranslation();
  return (
    <View
      style={{
        padding: 12,
        backgroundColor: theme.tableBackground,
        borderRadius: 6,
        border: `1px solid ${theme.tableBorder}`,
        gap: 8,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            color: theme.pageTextLight,
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}
        >
          {title}
        </Text>
        {onRemove && (
          <Button
            variant="bare"
            onPress={onRemove}
            aria-label={t('Remove pool')}
            style={{ color: theme.pageTextLight, padding: 2 }}
          >
            <SvgDelete width={10} height={10} style={{ color: 'inherit' }} />
          </Button>
        )}
      </View>

      <LabeledCheckbox
        id={`cleanup-send-${title}`}
        checked={send}
        onChange={e => onChangeSend(e.target.checked)}
      >
        <span style={{ marginLeft: 6, fontSize: 12 }}>{sendLabel}</span>
      </LabeledCheckbox>

      <LabeledCheckbox
        id={`cleanup-take-${title}`}
        checked={take}
        onChange={e => onChangeTake(e.target.checked)}
      >
        <span style={{ marginLeft: 6, fontSize: 12 }}>{takeLabel}</span>
      </LabeledCheckbox>

      {take && (
        <View style={{ marginLeft: 22, gap: 6 }}>
          {showOverspendOnly && (
            <LabeledCheckbox
              id={`cleanup-overspend-${title}`}
              checked={overspendOnly}
              onChange={e => onChangeOverspendOnly(e.target.checked)}
            >
              <span style={{ marginLeft: 6, fontSize: 12 }}>
                <Trans>Only enough to cover any overspending</Trans>
              </span>
            </LabeledCheckbox>
          )}
          {!overspendOnly && (
            <SpaceBetween align="center" gap={10}>
              <FormLabel
                title={t('Weight')}
                htmlFor={`cleanup-weight-${title}`}
              />
              <Input
                id={`cleanup-weight-${title}`}
                type="number"
                min={1}
                step={1}
                style={{ width: 80 }}
                value={String(weight)}
                onChangeValue={value => {
                  const parsed = Math.max(1, Math.trunc(Number(value)) || 1);
                  onChangeWeight(parsed);
                }}
              />
            </SpaceBetween>
          )}
        </View>
      )}
    </View>
  );
}
