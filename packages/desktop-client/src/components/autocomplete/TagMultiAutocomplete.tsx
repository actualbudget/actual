import { useMemo } from 'react';
import type { ComponentProps } from 'react';

import { theme } from '@actual-app/components/theme';
import type { View } from '@actual-app/components/view';
import { extractTagsForFilter } from '@actual-app/core/shared/tags';
import { css } from '@emotion/css';

import { useTagCSS } from '#hooks/useTagCSS';
import { filterTags, useTags } from '#hooks/useTags';

import { Autocomplete } from './Autocomplete';
import type { AutocompleteItem } from './Autocomplete';

export function TagMultiAutocomplete({
  value,
  setValue,
}: {
  value: string;
  setValue: (value: string) => void;
}) {
  const tags = useMemo(() => {
    return extractTagsForFilter(value);
  }, [value]);
  const { data: allTags } = useTags();
  const allTagItems = useMemo(
    () =>
      allTags?.map(tag => ({
        ...tag,
        id: '#' + tag.tag,
        name: '#' + tag.tag,
      })) ?? [],
    [allTags],
  );

  function handleSelect(ids: string[]) {
    setValue(ids.join(' '));
  }

  return (
    <Autocomplete<(typeof allTagItems)[number]>
      value={tags}
      strict
      type="multi"
      onSelect={handleSelect}
      suggestions={allTagItems}
      filterSuggestions={filterTags}
      renderItems={(items, getItemProps, highlightedIndex) => (
        <TagList
          items={items}
          getItemProps={getItemProps}
          highlightedIndex={highlightedIndex}
        />
      )}
      inputProps={{ placeholder: 'Choose tags' }}
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
