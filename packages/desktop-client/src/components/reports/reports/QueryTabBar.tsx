import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { SvgAdd, SvgEditPencil } from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

type QueryTabBarProps = {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onRename?: (index: number, name: string) => void;
  names?: string[];
};

export function QueryTabBar({
  count,
  activeIndex,
  onSelect,
  onAdd,
  onRemove,
  onRename,
  names,
}: QueryTabBarProps) {
  const { t } = useTranslation();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 12,
        flexWrap: 'wrap',
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor:
              activeIndex === i
                ? theme.pillBackgroundSelected
                : theme.pillBackground,
            borderRadius: 4,
          }}
        >
          {editingIndex === i ? (
            <input
              ref={el => el?.focus()}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  onRename?.(i, editValue);
                  setEditingIndex(null);
                } else if (e.key === 'Escape') {
                  setEditingIndex(null);
                }
              }}
              onBlur={() => {
                onRename?.(i, editValue);
                setEditingIndex(null);
              }}
              style={{
                padding: '7px 10px',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 13,
                fontFamily: 'inherit',
                color:
                  activeIndex === i ? theme.pillTextSelected : theme.pillText,
                width: 150,
              }}
            />
          ) : (
            <Button
              variant="bare"
              onPress={() => onSelect(i)}
              style={{
                padding: '7px 10px',
                ...(activeIndex === i && { color: theme.pillTextSelected }),
              }}
            >
              {names?.[i] || t('Query {{index}}', { index: i + 1 })}
            </Button>
          )}
          {count > 1 && onRename && (
            <Button
              variant="bare"
              onPress={() => {
                setEditingIndex(i);
                setEditValue(names?.[i] || '');
              }}
              aria-label={t('Rename Query {{index}}', { index: i + 1 })}
              style={{ padding: '7px 5px' }}
            >
              <SvgEditPencil style={{ width: 8, height: 8, margin: 4 }} />
            </Button>
          )}
          {count > 1 && (
            <Button
              variant="bare"
              onPress={() => onRemove(i)}
              aria-label={t('Remove Query {{index}}', { index: i + 1 })}
              style={{ padding: '7px 5px' }}
            >
              <SvgDelete style={{ width: 8, height: 8, margin: 4 }} />
            </Button>
          )}
        </View>
      ))}
      <Button variant="bare" onPress={onAdd}>
        <SvgAdd width={10} height={10} style={{ marginRight: 3 }} />
        <Trans>Add new</Trans>
      </Button>
    </View>
  );
}
