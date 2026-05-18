import { useMemo } from 'react';

import { extractTagsForFilter } from '@actual-app/core/shared/tags';

import { useTags } from '#hooks/useTags';

import { Autocomplete } from './Autocomplete';

export function TagMultiSelect({
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

  return (
    <Autocomplete value={tags} strict type="multi" onSelect={console.log} filterSuggestions={} />
  );
}
