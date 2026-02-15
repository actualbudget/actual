import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { SpaceBetween } from '@actual-app/components/space-between';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/connection';
import type { Template } from 'loot-core/types/models/templates';

import { Link } from '@desktop-client/components/common/Link';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { Notes } from '@desktop-client/components/Notes';
import { useCategory } from '@desktop-client/hooks/useCategory';
import { useNotes } from '@desktop-client/hooks/useNotes';

export function UnmigrateBudgetAutomationsModal({
  categoryId,
  templates,
}: {
  categoryId: string;
  templates: Template[];
}) {
  const { t } = useTranslation();
  const { data: category } = useCategory(categoryId);
  const existingNotes = useNotes(categoryId) || '';
  const [editedNotes, setEditedNotes] = useState<string>('');

  const [rendered, setRendered] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const text: string = await send(
          'budget/render-note-templates',
          templates,
        );
        if (mounted) setRendered(text);
      } catch {
        if (mounted) setRendered('');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [templates]);

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
    await send('notes-save-undoable', { id: categoryId, note: editedNotes });
    await send('budget/set-category-automations', {
      categoriesWithTemplates: [{ id: categoryId, templates }],
      source: 'notes',
    });
    setSaving(false);
    close();
  }

  return (
    <Modal
      name="category-automations-unmigrate"
      containerProps={{
        style: { width: 850, height: 650, paddingBottom: 20 },
      }}
    >
      {({ state: { close } }) => (
        <SpaceBetween direction="vertical" style={{ height: '100%' }}>
          <ModalHeader
            title={t('Un-migrate automations: {{category}}', {
              category: category?.name,
            })}
            rightContent={<ModalCloseButton onPress={close} />}
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
            <Button onPress={() => close()}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              variant="primary"
              onPress={() => onSave(close)}
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
