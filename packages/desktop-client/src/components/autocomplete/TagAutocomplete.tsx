import {
  Fragment,
  type ComponentProps,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type KeyboardEvent,
  type FocusEvent,
  useMemo,
  useCallback,
} from 'react';
import { useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { Autocomplete } from './Autocomplete';

import { useTags, useTagCSS } from '@desktop-client/style/tags';

type TagAutocompleteItem = {
  id: string;
  name: string;
  tag: string;
  color?: string;
};

type TagListProps = {
  items: TagAutocompleteItem[];
  getItemProps: (arg: {
    item: TagAutocompleteItem;
  }) => ComponentProps<typeof View>;
  highlightedIndex: number;
  renderTagItem?: (
    props: ComponentPropsWithoutRef<typeof TagItem>,
  ) => ReactElement<typeof TagItem>;
};

function TagList({
  items,
  getItemProps,
  highlightedIndex,
  renderTagItem = defaultRenderTagItem,
}: TagListProps) {
  return (
    <View>
      <View
        style={{
          overflowY: 'auto',
          willChange: 'transform',
          padding: '5px 0',
          maxHeight: 175,
        }}
      >
        {items.map((item, index) => (
          <Fragment key={item.id}>
            {renderTagItem({
              ...getItemProps({ item }),
              item,
              highlighted: highlightedIndex === index,
            })}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

type TagAutocompleteProps = Omit<
  ComponentProps<typeof Autocomplete<TagAutocompleteItem>>,
  'value' | 'onSelect' | 'type'
> & {
  value: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  multi?: boolean;
};

export function TagAutocomplete({
  multi,
  value,
  onSelect,
  inputProps,
  placeholder,
  ...props
}: TagAutocompleteProps) {
  const { t } = useTranslation();
  const tags = useTags();
  // Intentionally unused here; styling is applied within TagItem
  // (no-op)

  const suggestions: TagAutocompleteItem[] = useMemo(() => {
    if (!tags || tags.length === 0) {
      return [];
    }
    return tags.map(tag => ({
      id: `#${tag.tag}`,
      name: `#${tag.tag}`,
      tag: tag.tag,
      color: tag.color ?? undefined,
    }));
  }, [tags]);

  const formatTag = useCallback((tag: string) => {
    const trimmed = tag.trim();
    return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  }, []);

  const getCurrentTags = useCallback(() => {
    return value ? value.split(' ').filter(Boolean) : [];
  }, [value]);

  const handleSingleSelect = useCallback(
    (id: string) => {
      onSelect(id);
    },
    [onSelect],
  );

  const handleMultiSelect = useCallback(
    (ids: string[]) => {
      const formattedTags = ids
        .map(formatTag)
        .filter((tag, index, array) => array.indexOf(tag) === index)
        .filter(tag => tag.length > 1);

      onSelect(formattedTags.join(' '));
    },
    [onSelect, formatTag],
  );

  const handleMultiSelectWithCustomInput = useCallback(
    (ids: string[] | string, id?: string) => {
      if (Array.isArray(ids)) {
        handleMultiSelect(ids);
      } else {
        const inputValue = ids || id || '';
        const formattedTag = formatTag(inputValue);
        const currentTags = getCurrentTags();

        if (!currentTags.includes(formattedTag) && formattedTag.length > 1) {
          const updatedTags = [...currentTags, formattedTag];
          onSelect(updatedTags.join(' '));
        }
      }
    },
    [onSelect, handleMultiSelect, formatTag, getCurrentTags],
  );

  const handleMultiInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
        const newTag = e.currentTarget.value.trim();
        const formattedTag = formatTag(newTag);
        const currentTags = getCurrentTags();

        if (!currentTags.includes(formattedTag) && formattedTag.length > 1) {
          const updatedTags = [...currentTags, formattedTag];
          onSelect(updatedTags.join(' '));
        }

        e.preventDefault();
        e.stopPropagation();
      }
    },
    [onSelect, formatTag, getCurrentTags],
  );

  const filterSuggestions = useCallback(
    (suggestions: TagAutocompleteItem[], inputValue: string) => {
      const selectedTags = getCurrentTags();
      const inputFiltered = suggestions.filter(item =>
        item.name.toLowerCase().includes(inputValue.toLowerCase()),
      );
      return inputFiltered.filter(item => !selectedTags.includes(item.id));
    },
    [getCurrentTags],
  );

  const renderItems = useCallback(
    (
      items: TagAutocompleteItem[],
      getItemProps: (arg: {
        item: TagAutocompleteItem;
      }) => ComponentProps<typeof View>,
      highlightedIndex: number,
    ) => (
      <TagList
        items={items}
        getItemProps={getItemProps}
        highlightedIndex={highlightedIndex}
      />
    ),
    [],
  );

  const handleBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      const typedValue = e.target.value.trim();
      if (!typedValue) {
        inputProps?.onBlur?.(e);
        return;
      }

      const formattedTag = formatTag(typedValue);
      if (formattedTag.length <= 1) {
        inputProps?.onBlur?.(e);
        return;
      }

      if (multi) {
        const currentTags = getCurrentTags();
        if (!currentTags.includes(formattedTag)) {
          const updatedTags = [...currentTags, formattedTag];
          onSelect(updatedTags.join(' '));
        }
      } else if (typedValue !== value) {
        onSelect(formattedTag);
      }

      inputProps?.onBlur?.(e);
    },
    [multi, value, onSelect, formatTag, getCurrentTags, inputProps],
  );

  if (multi) {
    const selectedTags = getCurrentTags();
    const showPlaceholder = selectedTags.length === 0;

    return (
      <Autocomplete
        type="multi"
        suggestions={suggestions}
        value={selectedTags}
        onSelect={handleMultiSelectWithCustomInput}
        openOnFocus={true}
        strict={false}
        clearOnSelect={false}
        clearOnBlur={true}
        shouldSaveFromKey={e => e.key === 'Enter'}
        filterSuggestions={filterSuggestions}
        renderItems={renderItems}
        inputProps={{
          ...inputProps,
          placeholder: showPlaceholder ? placeholder || t('nothing') : '',
          onKeyDown: e => {
            handleMultiInputKeyDown(e);
            inputProps?.onKeyDown?.(e);
          },
          onBlur: handleBlur,
        }}
        {...(props as unknown as Omit<
          ComponentProps<typeof Autocomplete<TagAutocompleteItem>>,
          'value' | 'onSelect' | 'type'
        >)}
      />
    );
  }

  return (
    <Autocomplete
      suggestions={suggestions}
      value={value || ''}
      onSelect={handleSingleSelect}
      openOnFocus={true}
      clearOnBlur={true}
      clearOnSelect={false}
      strict={false}
      renderItems={renderItems}
      inputProps={{
        ...inputProps,
        placeholder: placeholder || t('nothing'),
        onBlur: handleBlur,
      }}
      {...(props as unknown as Omit<
        ComponentProps<typeof Autocomplete<TagAutocompleteItem>>,
        'value' | 'onSelect' | 'type'
      >)}
    />
  );
}

type TagItemProps = {
  item: TagAutocompleteItem;
  highlighted?: boolean;
};

function TagItem({ item, highlighted, ...props }: TagItemProps) {
  const getTagCSS = useTagCSS();

  return (
    <div
      role="button"
      className={css({
        padding: 5,
        cursor: 'default',
        backgroundColor: highlighted
          ? theme.menuAutoCompleteBackgroundHover
          : undefined,
      })}
      {...props}
    >
      <Text className={getTagCSS(item.tag)}>{item.name}</Text>
    </div>
  );
}

function defaultRenderTagItem(
  props: ComponentPropsWithoutRef<typeof TagItem>,
): ReactElement<typeof TagItem> {
  return <TagItem {...props} />;
}
