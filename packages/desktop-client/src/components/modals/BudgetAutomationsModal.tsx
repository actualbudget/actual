import { useCallback, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { SpaceBetween } from '@actual-app/components/space-between';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import uniqueId from 'lodash/uniqueId';

import { send } from 'loot-core/platform/client/connection';
import { q } from 'loot-core/shared/query';
import type {
  CategoryGroupEntity,
  ScheduleEntity,
} from 'loot-core/types/models';
import type { Template } from 'loot-core/types/models/templates';

import { Warning } from '@desktop-client/components/alerts';
import { BudgetAutomation } from '@desktop-client/components/budget/goals/BudgetAutomation';
import { DEFAULT_PRIORITY } from '@desktop-client/components/budget/goals/reducer';
import { useBudgetAutomationCategories } from '@desktop-client/components/budget/goals/useBudgetAutomationCategories';
import { Link } from '@desktop-client/components/common/Link';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { useBudgetAutomations } from '@desktop-client/hooks/useBudgetAutomations';
import { useCategory } from '@desktop-client/hooks/useCategory';
import { useNotes } from '@desktop-client/hooks/useNotes';
import { useSchedules } from '@desktop-client/hooks/useSchedules';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

function BudgetAutomationList({
  automations,
  setAutomations,
  schedules,
  categories,
  style,
}: {
  automations: Template[];
  setAutomations: (fn: (prev: Template[]) => Template[]) => void;
  schedules: readonly ScheduleEntity[];
  categories: CategoryGroupEntity[];
  style?: CSSProperties;
}) {
  const [automationIds, setAutomationIds] = useState(() => {
    // automations don't have ids, so we need to generate them
    return automations.map(() => uniqueId('automation-'));
  });

  const onAdd = () => {
    const newId = uniqueId('automation-');
    setAutomationIds(prevIds => [...prevIds, newId]);
    setAutomations(prev => [
      ...prev,
      {
        type: 'simple',
        monthly: 5,
        directive: 'template',
        priority: DEFAULT_PRIORITY,
      },
    ]);
  };
  const onDelete = (index: number) => () => {
    setAutomations(prev => [...prev.slice(0, index), ...prev.slice(index + 1)]);
    setAutomationIds(prev => [
      ...prev.slice(0, index),
      ...prev.slice(index + 1),
    ]);
  };

  const onSave = useCallback(
    (index: number) => (template: Template) => {
      setAutomations(prev =>
        prev.map((oldAutomation, mapIndex) =>
          mapIndex === index ? template : oldAutomation,
        ),
      );
    },
    [setAutomations],
  );

  return (
    <SpaceBetween
      direction="vertical"
      gap={20}
      align="stretch"
      wrap={false}
      style={{
        overflowY: 'scroll',
        ...style,
      }}
    >
      {automations.map((automation, index) => (
        <BudgetAutomation
          key={automationIds[index]}
          onSave={onSave(index)}
          onDelete={onDelete(index)}
          template={automation}
          categories={categories}
          schedules={schedules}
          readOnlyStyle={{
            color: theme.pillText,
            backgroundColor: theme.pillBackground,
            borderRadius: 4,
            padding: 16,
            paddingLeft: 30,
            paddingRight: 16,
          }}
        />
      ))}
      <Button onPress={onAdd}>
        <Trans>Add new automation</Trans>
      </Button>
    </SpaceBetween>
  );
}

function BudgetAutomationMigrationWarning({
  categoryId,
  style,
}: {
  categoryId: string;
  style?: CSSProperties;
}) {
  const notes = useNotes(categoryId);

  const templates = useMemo(() => {
    if (!notes) return null;
    const lines = notes.split('\n');
    return lines
      .flatMap(line => {
        if (line.trim().startsWith('#template')) return line;
        if (line.trim().startsWith('#goal')) return line;
        if (line.trim().startsWith('#cleanup')) return line;
        return [];
      })
      .join('\n');
  }, [notes]);

  if (!templates) return null;

  return (
    <Warning style={style}>
      <SpaceBetween direction="vertical" style={{ minHeight: 'unset' }}>
        <View>
          <Trans>
            This category uses notes-based automations (formerly "budget
            templates"). We have automatically imported your existing
            automations below. Please review them for accuracy and hit save to
            complete the migration.
          </Trans>
        </View>
        <View>
          <Trans>
            Original templates:
            <View
              style={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                marginTop: 4,
                padding: 12,
                borderRadius: 4,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              {templates}
            </View>
          </Trans>
        </View>
      </SpaceBetween>
    </Warning>
  );
}

export function BudgetAutomationsModal({ categoryId }: { categoryId: string }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [automations, setAutomations] = useState<Record<string, Template[]>>(
    {},
  );
  const { loading } = useBudgetAutomations({
    categoryId,
    onLoaded: setAutomations,
  });

  const schedulesQuery = useMemo(() => q('schedules').select('*'), []);
  const { schedules } = useSchedules({
    query: schedulesQuery,
  });

  const categories = useBudgetAutomationCategories();
  const { data: currentCategory } = useCategory(categoryId);

  const needsMigration = currentCategory?.template_settings?.source !== 'ui';

  const onSave = async (close: () => void) => {
    if (!automations[categoryId]) {
      close();
      return;
    }

    await send('budget/set-category-automations', {
      categoriesWithTemplates: [
        {
          id: categoryId,
          templates: automations[categoryId],
        },
      ],
      source: 'ui',
    });
    close();
  };

  return (
    <Modal
      name="category-automations-edit"
      containerProps={{
        style: { width: 850, height: 650, paddingBottom: 20 },
      }}
    >
      {({ state: { close } }) => (
        <SpaceBetween
          direction="vertical"
          wrap={false}
          align="stretch"
          style={{ height: '100%' }}
        >
          <ModalHeader
            title={t('Budget automations: {{category}}', {
              category: currentCategory?.name,
            })}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          {loading ? (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AnimatedLoading style={{ width: 20, height: 20 }} />
            </View>
          ) : (
            <SpaceBetween align="stretch" direction="vertical">
              {needsMigration && (
                <BudgetAutomationMigrationWarning categoryId={categoryId} />
              )}
              <BudgetAutomationList
                automations={automations[categoryId] || []}
                setAutomations={(cb: (prev: Template[]) => Template[]) => {
                  setAutomations(prev => ({
                    ...prev,
                    [categoryId]: cb(prev[categoryId] || []),
                  }));
                }}
                schedules={schedules}
                categories={categories}
              />
            </SpaceBetween>
          )}
          <View style={{ flexGrow: 1 }} />
          <SpaceBetween
            style={{
              marginTop: 20,
              justifyContent: 'flex-end',
              flexShrink: 0,
            }}
          >
            {!needsMigration && (
              <Link
                variant="text"
                onClick={() => {
                  const templates = automations[categoryId] || [];
                  dispatch(
                    pushModal({
                      modal: {
                        name: 'category-automations-unmigrate',
                        options: { categoryId, templates },
                      },
                    }),
                  );
                }}
              >
                <Trans>Un-migrate</Trans>
              </Link>
            )}
            {/* <View style={{ flex: 1 }} /> */}
            <Button onPress={close}>
              <Trans>Cancel</Trans>
            </Button>
            <Button variant="primary" onPress={() => onSave(close)}>
              <Trans>Save</Trans>
            </Button>
          </SpaceBetween>
        </SpaceBetween>
      )}
    </Modal>
  );
}
