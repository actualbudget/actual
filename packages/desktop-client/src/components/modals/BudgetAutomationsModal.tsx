import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { SpaceBetween } from '@actual-app/components/space-between';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import uniqueId from 'lodash/uniqueId';

import { send } from 'loot-core/platform/client/fetch';
import { q } from 'loot-core/shared/query';
import {
  type CategoryGroupEntity,
  type ScheduleEntity,
} from 'loot-core/types/models';
import type { Template } from 'loot-core/types/models/templates';

import { Warning } from '@desktop-client/components/alerts';
import { BudgetAutomation } from '@desktop-client/components/budget/goals/BudgetAutomation';
import { type DisplayTemplateType } from '@desktop-client/components/budget/goals/constants';
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

type AutomationEntry = {
  id: string;
  template: Template;
  displayType: DisplayTemplateType;
};

function getDisplayTypeFromTemplate(template: Template): DisplayTemplateType {
  switch (template.type) {
    case 'percentage':
      return 'percentage';
    case 'schedule':
      return 'schedule';
    case 'periodic':
    case 'simple':
      return 'week';
    case 'limit':
      return 'limit';
    case 'average':
    case 'copy':
      return 'historical';
    default:
      return 'week';
  }
}

function createAutomationEntry(
  template: Template,
  displayType: DisplayTemplateType,
): AutomationEntry {
  return {
    id: uniqueId('automation-'),
    template,
    displayType,
  };
}

function expandAutomations(templates: Template[]): AutomationEntry[] {
  const entries: AutomationEntry[] = [];

  templates.forEach(template => {
    if (template.type === 'limit') {
      entries.push(
        createAutomationEntry({ ...template, refill: false }, 'limit'),
      );
      if (template.refill) {
        entries.push(
          createAutomationEntry({ ...template, refill: true }, 'refill'),
        );
      }
      return;
    }
    entries.push(
      createAutomationEntry(template, getDisplayTypeFromTemplate(template)),
    );
  });

  return entries;
}

function collapseAutomations(entries: AutomationEntry[]): Template[] {
  const hasRefill = entries.some(entry => entry.displayType === 'refill');
  const templates: Template[] = [];

  entries.forEach(entry => {
    if (entry.displayType === 'refill') {
      return;
    }
    if (entry.displayType === 'limit') {
      if (entry.template.type !== 'limit') {
        throw new Error('Expected limit template for limit automation');
      }
      templates.push({
        ...entry.template,
        refill: hasRefill,
      });
      return;
    }
    templates.push(entry.template);
  });

  return templates;
}

function BudgetAutomationList({
  automations,
  setAutomations,
  schedules,
  categories,
  style,
}: {
  automations: AutomationEntry[];
  setAutomations: (fn: (prev: AutomationEntry[]) => AutomationEntry[]) => void;
  schedules: readonly ScheduleEntity[];
  categories: CategoryGroupEntity[];
  style?: CSSProperties;
}) {
  const onAdd = () => {
    setAutomations(prev => [
      ...prev,
      createAutomationEntry(
        {
          type: 'periodic',
          amount: 5,
          period: {
            period: 'month',
            amount: 5,
          },
          directive: 'template',
          priority: DEFAULT_PRIORITY,
        },
        'week',
      ),
    ]);
  };
  const onAddLimit = () => {
    setAutomations(prev => [
      ...prev,
      createAutomationEntry(
        {
          directive: 'template',
          type: 'limit',
          amount: 500,
          period: 'monthly',
          hold: false,
          refill: false,
          priority: null,
        },
        'limit',
      ),
    ]);
  };
  const onDelete = (index: number) => () => {
    setAutomations(prev => [...prev.slice(0, index), ...prev.slice(index + 1)]);
  };

  const onSave = useCallback(
    (index: number) =>
      (template: Template, displayType: DisplayTemplateType) => {
        setAutomations(prev =>
          prev.map((oldAutomation, mapIndex) =>
            mapIndex === index
              ? { ...oldAutomation, template, displayType }
              : oldAutomation,
          ),
        );
      },
    [setAutomations],
  );

  const hasLimitAutomation = automations.some(
    automation => automation.displayType === 'limit',
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
          key={automation.id}
          onSave={onSave(index)}
          onDelete={onDelete(index)}
          template={automation.template}
          displayType={automation.displayType}
          categories={categories}
          schedules={schedules}
          hasLimitAutomation={hasLimitAutomation}
          onAddLimitAutomation={
            automation.displayType === 'refill' ? onAddLimit : undefined
          }
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

  const [automations, setAutomations] = useState<
    Record<string, AutomationEntry[]>
  >({});
  const { loading } = useBudgetAutomations({
    categoryId,
    onLoaded: result => {
      const next: Record<string, AutomationEntry[]> = {};
      for (const [id, templates] of Object.entries(result)) {
        next[id] = expandAutomations(templates);
      }
      setAutomations(next);
    },
  });

  const schedulesQuery = useMemo(() => q('schedules').select('*'), []);
  const { schedules } = useSchedules({
    query: schedulesQuery,
  });

  const categories = useBudgetAutomationCategories();
  const currentCategory = useCategory(categoryId);

  const needsMigration = currentCategory?.template_settings?.source !== 'ui';

  const onSave = async (close: () => void) => {
    if (!automations[categoryId]) {
      close();
      return;
    }

    const templates = collapseAutomations(automations[categoryId]);
    await send('budget/set-category-automations', {
      categoriesWithTemplates: [
        {
          id: categoryId,
          templates,
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
                setAutomations={(
                  cb: (prev: AutomationEntry[]) => AutomationEntry[],
                ) => {
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
                        options: {
                          categoryId,
                          templates: collapseAutomations(templates),
                        },
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
