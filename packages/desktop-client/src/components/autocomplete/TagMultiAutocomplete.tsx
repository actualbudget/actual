import { useMemo } from 'react';

import { extractTagsForFilter } from '@actual-app/core/shared/tags';

import { filterTags, useTags } from '#hooks/useTags';

import { Autocomplete } from './Autocomplete';

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
    />
  );
}
