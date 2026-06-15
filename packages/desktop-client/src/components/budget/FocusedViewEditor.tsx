import React, { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '#components/common/Modal';
import { Checkbox } from '#components/forms';
import { useCategories } from '#hooks/useCategories';
import { useFocusedViews } from '#hooks/useFocusedViews';

type FocusedViewEditorProps = {
  viewId?: string; // If undefined, creating a new view
  onClose: () => void;
};

export function FocusedViewEditor({ viewId, onClose }: FocusedViewEditorProps) {
  const { t } = useTranslation();
  const { views, createView, updateView } = useFocusedViews();
  const { data: { grouped: categoryGroups = [] } = { grouped: [] } } =
    useCategories();

  const existingView = useMemo(
    () => views.find(v => v.id === viewId),
    [views, viewId],
  );

  const [name, setName] = useState(existingView?.name || '');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(
    new Set(existingView?.categoryIds || []),
  );

  // Filter out income groups
  const expenseGroups = useMemo(
    () => categoryGroups.filter(g => !g.is_income && !g.hidden),
    [categoryGroups],
  );

  const handleToggleCategory = (id: string) => {
    setSelectedCategoryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleGroup = (groupId: string) => {
    const group = expenseGroups.find(g => g.id === groupId);
    if (!group || !group.categories) return;

    const groupCatIds = group.categories.filter(c => !c.hidden).map(c => c.id);
    const allSelected = groupCatIds.every(id => selectedCategoryIds.has(id));

    setSelectedCategoryIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        groupCatIds.forEach(id => next.delete(id));
      } else {
        groupCatIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!name.trim()) return;

    if (existingView) {
      updateView(existingView.id, {
        name: name.trim(),
        categoryIds: Array.from(selectedCategoryIds),
      });
    } else {
      createView(name.trim(), Array.from(selectedCategoryIds));
    }
    onClose();
  };

  return (
    <Modal name="focused-view-editor" onClose={onClose}>
      <ModalHeader
        title={
          <ModalTitle
            title={
              existingView ? t('Edit Focused View') : t('Create Focused View')
            }
          />
        }
        rightContent={<ModalCloseButton onPress={onClose} />}
      />

      <View style={{ padding: 15, ...styles.scrollbar, overflowY: 'auto' }}>
        <View style={{ marginBottom: 20 }}>
          <Text style={{ marginBottom: 5, fontWeight: 500 }}>
            <Trans>View Name</Trans>
          </Text>
          <InitialFocus>
            <Input
              value={name}
              onChangeValue={setName}
              placeholder={t('e.g., Monthly Bills')}
              onEnter={handleSave}
            />
          </InitialFocus>
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={{ marginBottom: 10, fontWeight: 500 }}>
            <Trans>Select Categories</Trans>
          </Text>

          <View
            style={{
              border: `1px solid ${theme.tableBorder}`,
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            {expenseGroups.map(group => {
              const groupCatIds =
                group.categories?.filter(c => !c.hidden).map(c => c.id) || [];
              const allSelected =
                groupCatIds.length > 0 &&
                groupCatIds.every(id => selectedCategoryIds.has(id));
              const _someSelected =
                !allSelected &&
                groupCatIds.some(id => selectedCategoryIds.has(id));

              return (
                <View key={group.id}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: '8px 10px',
                      backgroundColor: theme.tableHeaderBackground,
                      borderBottom: `1px solid ${theme.tableBorder}`,
                    }}
                  >
                    <Checkbox
                      checked={allSelected}
                      onChange={() => handleToggleGroup(group.id)}
                    />
                    <Text style={{ fontWeight: 600, marginLeft: 8 }}>
                      {group.name}
                    </Text>
                  </View>

                  {group.categories
                    ?.filter(c => !c.hidden)
                    .map(category => (
                      <View
                        key={category.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: '8px 10px',
                          paddingLeft: 30,
                          backgroundColor: theme.tableBackground,
                          borderBottom: `1px solid ${theme.tableBorder}`,
                        }}
                      >
                        <Checkbox
                          checked={selectedCategoryIds.has(category.id)}
                          onChange={() => handleToggleCategory(category.id)}
                        />
                        <Text style={{ marginLeft: 8 }}>{category.name}</Text>
                      </View>
                    ))}
                </View>
              );
            })}
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <Button onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isDisabled={!name.trim() || selectedCategoryIds.size === 0}
          >
            <Trans>Save</Trans>
          </Button>
        </View>
      </View>
    </Modal>
  );
}
