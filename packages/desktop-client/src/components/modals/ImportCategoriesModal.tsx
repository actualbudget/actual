// @ts-strict-ignore
import React, { useState, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type {
  CategoryEntity,
  CategoryGroupEntity,
} from 'loot-core/types/models';

import { createCategoryGroup } from '@desktop-client/budget/budgetSlice';
import { CategoryAutocomplete } from '@desktop-client/components/autocomplete/CategoryAutocomplete';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { popModal, pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

export type NewCategoryMapping = {
  originalName: string;
  finalName: string;
  existingCategoryId: CategoryEntity['id'] | null;
  groupId: CategoryGroupEntity['id'] | null;
};

type ImportCategoriesModalProps = {
  newCategories: string[];
  onConfirm: (mappings: NewCategoryMapping[]) => void;
  onCancel: () => void;
};

export function ImportCategoriesModal({
  newCategories,
  onConfirm,
  onCancel,
}: ImportCategoriesModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const categories = useCategories();

  // Find the first non-income, non-hidden group as default
  const defaultGroupId =
    categories.grouped.find(g => !g.is_income && !g.hidden)?.id || null;

  // Initialize mappings with original names
  const [mappings, setMappings] = useState<Map<string, NewCategoryMapping>>(
    () => {
      const map = new Map<string, NewCategoryMapping>();
      newCategories.forEach(name => {
        map.set(name, {
          originalName: name,
          finalName: name,
          existingCategoryId: null,
          groupId: defaultGroupId,
        });
      });
      return map;
    },
  );

  // Update mappings when defaultGroupId becomes available
  useEffect(() => {
    if (defaultGroupId) {
      setMappings(prevMappings => {
        const newMappings = new Map(prevMappings);
        let hasChanges = false;

        for (const [key, mapping] of newMappings) {
          // Only update if groupId is currently null (not user-modified or 'new-group')
          if (mapping.groupId === null) {
            newMappings.set(key, {
              ...mapping,
              groupId: defaultGroupId,
            });
            hasChanges = true;
          }
        }

        return hasChanges ? newMappings : prevMappings;
      });
    }
  }, [defaultGroupId]);

  const handleCategorySelect = (
    originalName: string,
    categoryId: CategoryEntity['id'] | null,
  ) => {
    const mapping = mappings.get(originalName);
    if (mapping) {
      setMappings(
        new Map(
          mappings.set(originalName, {
            ...mapping,
            existingCategoryId: categoryId,
            // Update final name based on selected category
            finalName: categoryId
              ? categories.list.find(c => c.id === categoryId)?.name ||
                mapping.finalName
              : mapping.finalName,
          }),
        ),
      );
    }
  };

  const handleGroupSelect = (
    originalName: string,
    groupId: CategoryGroupEntity['id'] | 'new-group' | null,
  ) => {
    // Special handling for "create new group" option
    if (groupId === 'new-group') {
      const mapping = mappings.get(originalName);
      const previousGroupId = mapping?.groupId || null;

      dispatch(
        pushModal({
          modal: {
            name: 'new-category-group',
            options: {
              onValidate: (name: string) =>
                !name ? t('Name is required.') : null,
              onSubmit: async (name: string) => {
                // Create the group and get its ID
                const result = await dispatch(createCategoryGroup({ name }));
                if (createCategoryGroup.fulfilled.match(result)) {
                  const newGroupId = result.payload;
                  // Update the mapping with the new group ID
                  const currentMapping = mappings.get(originalName);
                  if (currentMapping) {
                    setMappings(
                      new Map(
                        mappings.set(originalName, {
                          ...currentMapping,
                          groupId: newGroupId,
                        }),
                      ),
                    );
                  }
                } else {
                  // Restore previous groupId if creation failed
                  const currentMapping = mappings.get(originalName);
                  if (currentMapping) {
                    setMappings(
                      new Map(
                        mappings.set(originalName, {
                          ...currentMapping,
                          groupId: previousGroupId,
                        }),
                      ),
                    );
                  }
                }
              },
            },
          },
        }),
      );
      return;
    }

    const mapping = mappings.get(originalName);
    if (mapping) {
      setMappings(
        new Map(
          mappings.set(originalName, {
            ...mapping,
            groupId,
          }),
        ),
      );
    }
  };

  const handleConfirm = () => {
    const mappingArray = Array.from(mappings.values());
    onConfirm(mappingArray);
    dispatch(popModal());
  };

  const handleCancel = () => {
    onCancel();
    dispatch(popModal());
  };

  return (
    <Modal name="import-categories">
      {() => (
        <>
          <ModalHeader
            title={t('Import Categories')}
            rightContent={<ModalCloseButton onPress={handleCancel} />}
          />
          <View style={{ padding: 20, maxHeight: 600, overflow: 'auto' }}>
            <Text style={{ marginBottom: 15 }}>
              <Trans>
                Map imported categories to existing ones, or leave as-is to
                create new categories.
              </Trans>
            </Text>

            {/* Table Header */}
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                borderBottom: `1px solid ${theme.tableBorder}`,
                paddingBottom: 5,
                marginBottom: 10,
                fontWeight: 600,
              }}
            >
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ fontWeight: 600 }}>
                  <Trans>Imported Category</Trans>
                </Text>
              </View>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ fontWeight: 600 }}>
                  <Trans>Map To</Trans>
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 600 }}>
                  <Trans>Group</Trans>
                </Text>
              </View>
            </View>

            {/* Table Rows */}
            <View style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {newCategories.map(categoryName => {
                const mapping = mappings.get(categoryName);
                if (!mapping) return null;

                // Prepare category group options
                const groupOptions: [string, string][] = [
                  ...categories.grouped
                    .filter(g => !g.is_income && !g.hidden)
                    .map(g => [g.id, g.name] as [string, string]),
                  ['new-group', t('Create new group...')],
                ];

                // Compute safe value for Select - if groupId is null, use first available option
                const safeValue =
                  mapping.groupId ??
                  (groupOptions.length > 0 ? groupOptions[0][0] : null);

                return (
                  <View
                    key={categoryName}
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: `1px solid ${theme.tableBorderHover}`,
                    }}
                  >
                    {/* Original Category Name */}
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {categoryName}
                      </Text>
                    </View>

                    {/* Category Autocomplete */}
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <CategoryAutocomplete
                        value={mapping.existingCategoryId}
                        categoryGroups={categories.grouped}
                        onSelect={categoryId => {
                          handleCategorySelect(categoryName, categoryId);
                        }}
                        inputProps={{
                          placeholder: mapping.existingCategoryId
                            ? t('Existing category selected')
                            : t('New'),
                        }}
                      />
                    </View>

                    {/* Category Group Dropdown (only visible when creating new category) */}
                    <View style={{ flex: 1 }}>
                      {!mapping.existingCategoryId ? (
                        groupOptions.length === 0 ? (
                          <View
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 13,
                                color: theme.pageTextSubdued,
                              }}
                            >
                              <Trans>No groups available</Trans>
                            </Text>
                            <Button
                              variant="bare"
                              onPress={() => {
                                handleGroupSelect(categoryName, 'new-group');
                              }}
                              style={{
                                padding: '4px 8px',
                                fontSize: 13,
                              }}
                            >
                              <Trans>Create group</Trans>
                            </Button>
                          </View>
                        ) : (
                          <Select
                            value={safeValue || ''}
                            onChange={groupId => {
                              handleGroupSelect(categoryName, groupId);
                            }}
                            options={groupOptions}
                            disabledKeys={[]}
                          />
                        )
                      ) : (
                        <Text
                          style={{
                            color: theme.pageTextSubdued,
                            fontStyle: 'italic',
                          }}
                        >
                          {(() => {
                            const selectedCategory = categories.list.find(
                              c => c.id === mapping.existingCategoryId,
                            );
                            const group = categories.grouped.find(
                              g => g.id === selectedCategory?.group,
                            );
                            return group?.name || t('N/A');
                          })()}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              padding: 20,
              gap: 10,
            }}
          >
            <Button onPress={handleCancel}>
              <Trans>Cancel</Trans>
            </Button>
            <ButtonWithLoading
              variant="primary"
              onPress={() => {
                handleConfirm();
              }}
            >
              <Trans>Continue Import</Trans>
            </ButtonWithLoading>
          </View>
        </>
      )}
    </Modal>
  );
}
