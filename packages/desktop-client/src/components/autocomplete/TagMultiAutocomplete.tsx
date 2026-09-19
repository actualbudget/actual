import type { ComponentProps } from 'react';

import { Button } from '@actual-app/components/button';
import { SvgRemove } from '@actual-app/components/icons/v2';
import { SpaceBetween } from '@actual-app/components/space-between';
import { theme } from '@actual-app/components/theme';
import type { View } from '@actual-app/components/view';
import { extractTagsForFilter } from '@actual-app/core/shared/tags';
import type { TagEntity } from '@actual-app/core/types/models';
import { css } from '@emotion/css';

import { useTagCSS } from '#hooks/useTagCSS';
import { filterTags, useTags } from '#hooks/useTags';

import { Autocomplete } from './Autocomplete';
import type { AutocompleteItem } from './Autocomplete';

type TagMultiAutocompleteProps = {
  tags?: TagEntity[];
  inputProps?: ComponentProps<typeof Autocomplete>['inputProps'];
  containerProps?: ComponentProps<typeof Autocomplete>['containerProps'];
  embedded?: boolean;
} & (
  | { mode?: 'names'; value: string; setValue: (value: string) => void }
  | { mode: 'ids'; value: string[]; setValue: (value: string[]) => void }
);

export function TagMultiAutocomplete(props: TagMultiAutocompleteProps) {
  const { tags, inputProps, containerProps, embedded } = props;
  const { data: loadedTags = [] } = useTags();
  const availableTags = tags ?? loadedTags;
  const tagItems = availableTags.map(tag => ({
    ...tag,
    id: props.mode === 'ids' ? tag.id : '#' + tag.tag,
    name: '#' + tag.tag,
  }));

  return (
    <Autocomplete<(typeof tagItems)[number]>
      value={
        props.mode === 'ids' ? props.value : extractTagsForFilter(props.value)
      }
      embedded={embedded}
      containerProps={containerProps}
      strict
      type="multi"
      onSelect={ids => {
        if (props.mode === 'ids') {
          props.setValue(ids);
        } else {
          props.setValue(ids.join(' '));
        }
      }}
      suggestions={tagItems}
      filterSuggestions={filterTags}
      renderItems={(items, getItemProps, highlightedIndex) => (
        <TagList
          items={items}
          getItemProps={getItemProps}
          highlightedIndex={highlightedIndex}
        />
      )}
      renderMultiItem={TagMultiItem}
      inputProps={{ placeholder: 'Choose tags', ...inputProps }}
    />
  );
}

function TagList<T extends AutocompleteItem>({
  items,
  getItemProps,
  highlightedIndex,
}: {
  items: T[];
  getItemProps: (arg: { item: T }) => ComponentProps<typeof View>;
  highlightedIndex: number;
}) {
  const getTagCSS = useTagCSS({ ellipsis: true });
  return (
    <div>
      {items.map((item, index) => {
        return (
          <div
            key={item.name}
            {...getItemProps({ item })}
            // oxlint-disable-next-line jsx_a11y/prefer-tag-over-role
            role="button"
            className={css({
              unset: 'all',
              cursor: 'pointer',
              padding: '4px 6px 1px 6px',
              backgroundColor:
                highlightedIndex === index
                  ? theme.menuAutoCompleteBackgroundHover
                  : undefined,
            })}
          >
            <div className={getTagCSS(item.name.slice(1))}>{item.name}</div>
          </div>
        );
      })}
    </div>
  );
}

function TagMultiItem({
  name,
  onRemove,
}: {
  name: string;
  onRemove: () => unknown;
}) {
  const getTagCSS = useTagCSS({ ellipsis: true });
  return (
    <Button
      variant="bare"
      onClick={onRemove}
      className={getTagCSS(name.replace(/^#/, ''))}
      style={{ margin: 1, maxWidth: 'calc(100% - 2px)' }}
    >
      <SpaceBetween direction="horizontal" gap={3} wrap={false} align="center">
        <span>{name}</span>
        <SvgRemove height={8} width={8} color={theme.buttonPrimaryText} />
      </SpaceBetween>
    </Button>
  );
}
