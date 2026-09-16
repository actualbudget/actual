import { useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import type {
  CustomReportTagScope,
  TagEntity,
} from '@actual-app/core/types/models';

import { TagMultiAutocomplete } from '#components/autocomplete/TagMultiAutocomplete';

import { normalizeTagScope, resolveTagScope } from './tagScope';

type TagScopeSelectorProps = {
  tags: TagEntity[];
  tagScope: CustomReportTagScope | undefined;
  onChange: (tagScope: CustomReportTagScope) => void;
};

export function TagScopeSelector({
  tags,
  tagScope,
  onChange,
}: TagScopeSelectorProps) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draftTagIds, setDraftTagIds] = useState<string[]>([]);
  const normalizedScope = normalizeTagScope(tagScope);
  const visibleTags = tags.filter(tag => !tag.hidden);
  const selectedTags = resolveTagScope(visibleTags, normalizedScope);
  const originalIds =
    normalizedScope.mode === 'all' ? [] : normalizedScope.tagIds;

  const summary =
    normalizedScope.mode === 'all'
      ? t('All tags')
      : selectedTags.length === 1
        ? `#${selectedTags[0].tag}`
        : t('{{count}} tags', { count: selectedTags.length });

  function openSelector() {
    setDraftTagIds(originalIds);
    setIsOpen(true);
  }

  function closeSelector() {
    setIsOpen(false);
    if (
      originalIds.length === draftTagIds.length &&
      originalIds.every(id => draftTagIds.includes(id))
    ) {
      return;
    }

    const selectedIds = visibleTags
      .filter(tag => draftTagIds.includes(tag.id))
      .map(tag => tag.id);
    const isAll =
      selectedIds.length === 0 || selectedIds.length === visibleTags.length;
    if (isAll && normalizedScope.mode === 'all') return;

    onChange(
      isAll ? { mode: 'all' } : { mode: 'selected', tagIds: selectedIds },
    );
  }

  return (
    <>
      <Button
        ref={triggerRef}
        onPress={openSelector}
        aria-label={t('Tag scope: {{scope}}', { scope: summary })}
        style={{ minWidth: 0, maxWidth: 160 }}
      >
        <Text
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {summary}
        </Text>
      </Button>
      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={isOpen}
        onOpenChange={open => {
          if (!open && isOpen) {
            closeSelector();
          }
        }}
        style={{ width: 280, padding: 10 }}
      >
        <View data-testid="tag-scope-popover" style={{ gap: 8 }}>
          <Text>
            <Trans>Leave empty to include all tags.</Trans>
          </Text>
          <TagMultiAutocomplete
            mode="ids"
            tags={visibleTags}
            value={draftTagIds}
            setValue={setDraftTagIds}
            embedded
            containerProps={{
              style: {
                flexDirection: 'column',
                maxHeight: 240,
                overflowY: 'auto',
              },
            }}
            inputProps={{
              autoFocus: true,
              placeholder: t('Search tags'),
              'aria-label': t('Search tags'),
            }}
          />
        </View>
      </Popover>
    </>
  );
}
