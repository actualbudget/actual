import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { SpaceBetween } from '@actual-app/components/space-between';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import type { Template } from '@actual-app/core/types/models/templates';

import { Link } from '#components/common/Link';
import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { Notes } from '#components/Notes';
import { useCategories } from '#hooks/useCategories';
import { useCategory } from '#hooks/useCategory';
import { useNotes } from '#hooks/useNotes';

// The UI's CategoryAutocomplete stores the income category id on a
// percentage template, but text-template grammar addresses categories by
// name. Rewrite percentage templates so the un-migrated notes are readable
// (and don't drift if the category is later renamed).
function sanitizePercentageCategoriesForNotes(
  templates: Template[],
  idToName: Map<string, string>,
): Template[] {
  return templates.map(template => {
    if (template.type !== 'percentage') return template;
    const name = idToName.get(template.category);
    if (name) return { ...template, category: name };
    return template;
  });
}

export function UnmigrateBudgetAutomationsModal({
  categoryId,
  templates,
}: {
  categoryId: string;
  templates: Template[];
}) {
  const { t } = useTranslation();
  const { data: category } = useCategory(categoryId);
  const { data: categoryData } = useCategories();
  const existingNotes = useNotes(categoryId) || '';
  const [editedNotes, setEditedNotes] = useState<string>('');

  const [rendered, setRendered] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!categoryData?.list) return;
    const idToName = new Map<string, string>();
    for (const cat of categoryData.list) {
      idToName.set(cat.id, cat.name);
    }
    const sanitized = sanitizePercentageCategoriesForNotes(templates, idToName);
    let mounted = true;
    void (async () => {
      try {
        const text: string = await send(
          'budget/render-note-templates',
          sanitized,
        );
        if (mounted) setRendered(text);
      } catch {
        if (mounted) setRendered('');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [templates, categoryData]);

  // Seed editable notes once templates rendered
  useEffect(() => {
    if (rendered !== null) {
      const base = existingNotes.trimEnd();
      if (!rendered) {
        setEditedNotes(base);
        return;
      }
      const existingLineSet = new Set(
        base
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0),
      );
      const renderedLines = rendered
        .split('\n')
        .map(l => l.trimEnd())
        .filter(l => l.length > 0);
      const newLines: string[] = [];
      for (const line of renderedLines) {
        if (!existingLineSet.has(line.trim())) {
          newLines.push(line);
        }
      }
      if (newLines.length === 0) {
        setEditedNotes(base);
      } else {
        const needsNewline = base && !base.endsWith('\n') ? '\n' : '';
        setEditedNotes(
          base +
            needsNewline +
            '\nExport from automations UI:\n' +
            newLines.join('\n'),
        );
      }
    }
  }, [rendered, existingNotes]);

  async function onSave(close: () => void) {
    setSaving(true);
    try {
      await send('notes-save-undoable', { id: categoryId, note: editedNotes });
      // Hand control back to the notes parser: clear the UI-managed goal_def
      // and mark notes as the source of truth. `storeNoteTemplates` will
      // re-derive goal_def from the notes the next time it runs (e.g. on
      // modal open or when applying templates).
      await send('budget/set-category-automations', {
        categoriesWithTemplates: [{ id: categoryId, templates: [] }],
        source: 'notes',
      });
      await send('budget/store-note-templates');
      close();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      name="category-automations-unmigrate"
      containerProps={{
        style: { width: 850, height: 650, paddingBottom: 20 },
      }}
    >
      {({ state }) => (
        <SpaceBetween direction="vertical" style={{ height: '100%' }}>
          <ModalHeader
            title={t('Un-migrate automations: {{category}}', {
              category: category?.name,
            })}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          {rendered === null ? (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AnimatedLoading style={{ width: 20, height: 20 }} />
            </View>
          ) : (
            <SpaceBetween
              direction="vertical"
              style={{ overflowY: 'auto', flex: 1 }}
            >
              <View style={{ display: 'inline-block', minHeight: 'unset' }}>
                <Trans>
                  If the automation UI isn&apos;t working for you, you can
                  temporarily switch back to notes-based automations. Please let
                  us know your feedback about what&apos;s not working on the{' '}
                  <Link
                    variant="external"
                    to="https://github.com/actualbudget/actual/issues/"
                  >
                    feedback issue
                  </Link>
                  .
                </Trans>
              </View>
              <View>
                <Trans>
                  We have merged your existing automations with the notes for
                  this category. Please review and edit as needed.
                </Trans>
              </View>
              <Notes
                notes={editedNotes}
                editable
                focused
                getStyle={() => ({
                  flex: 1,
                  borderRadius: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  resize: 'none',
                })}
                onChange={setEditedNotes}
              />
            </SpaceBetween>
          )}
          <SpaceBetween gap={10} style={{ justifyContent: 'flex-end' }}>
            <Button onPress={() => state.close()}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              variant="primary"
              onPress={() => onSave(() => state.close())}
              isDisabled={saving}
            >
              {saving && (
                <AnimatedLoading
                  style={{ width: 16, height: 16, marginRight: 6 }}
                />
              )}
              <Trans>Save notes & un-migrate</Trans>
            </Button>
          </SpaceBetween>
        </SpaceBetween>
      )}
    </Modal>
  );
}
