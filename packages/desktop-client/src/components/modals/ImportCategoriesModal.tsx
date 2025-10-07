import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type {
  CategoryEntity,
  CategoryGroupEntity,
} from 'loot-core/types/models';

import { useCreateCategoryGroupMutation } from '@desktop-client/budget';
import { CategoryAutocomplete } from '@desktop-client/components/autocomplete/CategoryAutocomplete';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { Field, Row, TableHeader } from '@desktop-client/components/table';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { popModal, pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

export type NewCategoryMapping = {
  originalName: string;
  finalName: string;
  existingCategoryId: CategoryEntity['id'] | null;
  groupId: CategoryGroupEntity['id'] | null;
};

type GroupSelectorProps = {
  mapping: NewCategoryMapping;
  categoryName: string;
  groupOptions: [string, string][];
  categoryGroupMap: Map<string, string>;
  onGroupSelect: (
    categoryName: string,
    groupId: CategoryGroupEntity['id'] | 'new-group' | null,
  ) => void;
};

function GroupSelector({
  mapping,
  categoryName,
  groupOptions,
  categoryGroupMap,
  onGroupSelect,
}: GroupSelectorProps) {
  const { t } = useTranslation();

  if (mapping.existingCategoryId) {
    return (
      <Text
        style={{
          color: theme.pageTextSubdued,
          fontStyle: 'italic',
        }}
      >
        {categoryGroupMap.get(mapping.existingCategoryId) || t('N/A')}
      </Text>
    );
  }

  if (groupOptions.length === 0) {
    return (
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
          onPress={() => onGroupSelect(categoryName, 'new-group')}
          style={{
            padding: '4px 8px',
            fontSize: 13,
          }}
        >
          <Trans>Create group</Trans>
        </Button>
      </View>
    );
  }

  const safeValue = mapping.groupId ?? groupOptions[0]?.[0] ?? 'new-group';

  return (
    <Select
      value={safeValue}
      onChange={groupId => onGroupSelect(categoryName, groupId)}
      options={[...groupOptions, ['new-group', t('Create new group...')]]}
      disabledKeys={[]}
    />
  );
}

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
  const createCategoryGroup = useCreateCategoryGroupMutation();
  const {
    data: { list: categories, grouped: categoryGroups } = {
      list: [],
      grouped: [],
    },
  } = useCategories();

  const defaultGroupId =
    categoryGroups.find(g => !g.is_income && !g.hidden)?.id || null;

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

  useEffect(() => {
    if (defaultGroupId) {
      setMappings(prevMappings => {
        const newMappings = new Map(prevMappings);
        let hasChanges = false;

        for (const [key, mapping] of newMappings) {
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

  function handleCategorySelect(
    originalName: string,
    categoryId: CategoryEntity['id'] | null,
  ) {
    setMappings(prevMappings => {
      const mapping = prevMappings.get(originalName);
      if (!mapping) return prevMappings;

      const newMappings = new Map(prevMappings);
      newMappings.set(originalName, {
        ...mapping,
        existingCategoryId: categoryId,
        finalName: categoryId
          ? categories.find(c => c.id === categoryId)?.name || mapping.finalName
          : mapping.finalName,
      });
      return newMappings;
    });
  }

  function handleGroupSelect(
    originalName: string,
    groupId: CategoryGroupEntity['id'] | 'new-group' | null,
  ) {
    if (groupId === 'new-group') {
      dispatch(
        pushModal({
          modal: {
            name: 'new-category-group',
            options: {
              onValidate: (name: string) =>
                !name ? t('Name is required.') : null,
              onSubmit: async (name: string) => {
                try {
                  const newGroupId = await createCategoryGroup.mutateAsync({
                    name,
                  });
                  setMappings(prevMappings => {
                    const currentMapping = prevMappings.get(originalName);
                    if (!currentMapping) return prevMappings;
                    const newMappings = new Map(prevMappings);
                    newMappings.set(originalName, {
                      ...currentMapping,
                      groupId: newGroupId,
                    });
                    return newMappings;
                  });
                } catch {
                  // Keep current mapping when group creation fails.
                }
              },
            },
          },
        }),
      );
      return;
    }

    setMappings(prevMappings => {
      const mapping = prevMappings.get(originalName);
      if (!mapping) return prevMappings;

      const newMappings = new Map(prevMappings);
      newMappings.set(originalName, {
        ...mapping,
        groupId,
      });
      return newMappings;
    });
  }

  function handleConfirm() {
    onConfirm(Array.from(mappings.values()));
    dispatch(popModal());
  }

  function handleCancel() {
    onCancel();
    dispatch(popModal());
  }

  const groupOptions: [string, string][] = categoryGroups
    .filter(g => !g.is_income && !g.hidden)
    .map(g => [g.id, g.name] as [string, string]);

  const categoryGroupMap = new Map<string, string>();
  for (const group of categoryGroups) {
    if (group.categories) {
      for (const category of group.categories) {
        categoryGroupMap.set(category.id, group.name);
      }
    }
  }

  return (
    <Modal name="import-categories">
      {() => (
        <>
          <ModalHeader
            title={t('Import Categories')}
            rightContent={<ModalCloseButton onPress={handleCancel} />}
          />
          <View style={{ padding: 20 }}>
            <Text style={{ marginBottom: 15 }}>
              <Trans>
                Map imported categories to existing ones, or leave as-is to
                create new categories.
              </Trans>
            </Text>

            <View
              style={{
                flex: 'unset',
                maxHeight: 400,
                border: '1px solid ' + theme.tableBorder,
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              <TableHeader
                headers={[
                  { name: t('Imported Category'), width: 'flex' },
                  { name: t('Map To'), width: 200 },
                  { name: t('Group'), width: 180 },
                ]}
              />

              <View
                style={{
                  overflow: 'auto',
                  backgroundColor: theme.tableBackground,
                }}
              >
                {newCategories.map(categoryName => {
                  const mapping = mappings.get(categoryName);
                  if (!mapping) return null;

                  return (
                    <Row
                      key={categoryName}
                      height={36}
                      style={{ backgroundColor: theme.tableBackground }}
                    >
                      <Field width="flex">
                        <Text
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {categoryName}
                        </Text>
                      </Field>

                      <Field width={200} truncate={false}>
                        <CategoryAutocomplete
                          value={mapping.existingCategoryId}
                          categoryGroups={categoryGroups}
                          onSelect={categoryId =>
                            handleCategorySelect(categoryName, categoryId)
                          }
                          inputProps={{
                            placeholder: mapping.existingCategoryId
                              ? t('Existing category selected')
                              : t('New'),
                          }}
                        />
                      </Field>

                      <Field width={180} truncate={false}>
                        <GroupSelector
                          mapping={mapping}
                          categoryName={categoryName}
                          groupOptions={groupOptions}
                          categoryGroupMap={categoryGroupMap}
                          onGroupSelect={handleGroupSelect}
                        />
                      </Field>
                    </Row>
                  );
                })}
              </View>
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
            <ButtonWithLoading variant="primary" onPress={handleConfirm}>
              <Trans>Continue Import</Trans>
            </ButtonWithLoading>
          </View>
        </>
      )}
    </Modal>
  );
}
