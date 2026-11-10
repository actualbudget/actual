import { useEffect, useId, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as undo from '@actual-app/core/platform/client/undo';
import type { TagEntity } from '@actual-app/core/types/models';
import { useQuery } from '@tanstack/react-query';

import { MobileBackButton } from '#components/mobile/MobileBackButton';
import {
  FieldLabel,
  InputField,
  TapField,
} from '#components/mobile/MobileForms';
import { withFilterParam } from '#components/mobile/utils';
import { MobilePageHeader, Page } from '#components/Page';
import { useNavigate } from '#hooks/useNavigate';
import { useTagCSS } from '#hooks/useTagCSS';
import { useTags } from '#hooks/useTags';
import { useUndo } from '#hooks/useUndo';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import {
  tagQueries,
  useCreateTagMutation,
  useDeleteTagMutation,
  useRenameTagMutation,
  useUpdateTagMutation,
} from '#tags';

import {
  getTagTransactionsLocationState,
  sanitiseTagName,
  sanitiseTagNameInput,
} from './utils';

export function MobileTagEditPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const tagsListPath = `/settings/tags${location.search}`;
  const { data: tags = [], isPending, isPlaceholderData } = useTags();

  const isNew = id === 'new';
  const isLoading = isPending || isPlaceholderData;
  const tag = isNew ? undefined : tags.find(candidate => candidate.id === id);
  const isMissing = !isNew && !isLoading && tag == null;

  useEffect(() => {
    if (isMissing) {
      void navigate(tagsListPath, { replace: true });
    }
  }, [isMissing, navigate, tagsListPath]);

  if (!isNew && tag == null) {
    return (
      <Page
        header={
          <MobilePageHeader
            title={t('Loading...')}
            leftContent={<MobileBackButton onPress={() => navigate(-1)} />}
          />
        }
        padding={0}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: theme.mobilePageBackground,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text>
            <Trans>Loading tag...</Trans>
          </Text>
        </View>
      </Page>
    );
  }

  return <TagEditForm key={tag?.id ?? 'new'} tag={tag} />;
}

type TagEditFormProps = {
  tag?: TagEntity;
};

function getTagValues(tag: TagEntity | undefined) {
  return {
    name: tag?.tag ?? '',
    color: tag?.color ?? null,
    description: tag?.description ?? '',
  };
}

function TagEditForm({ tag }: TagEditFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { showUndoNotification } = useUndo();
  const getTagCSS = useTagCSS({ ellipsis: true });
  const errorId = useId();
  const { mutateAsync: createTag, isPending: isCreating } =
    useCreateTagMutation();
  const { mutateAsync: updateTag, isPending: isUpdating } =
    useUpdateTagMutation();
  const { mutateAsync: renameTag, isPending: isRenaming } =
    useRenameTagMutation();
  const { mutateAsync: deleteTag, isPending: isDeleting } =
    useDeleteTagMutation();

  const filter = new URLSearchParams(location.search).get('filter') ?? '';
  const editPath = `${location.pathname}${location.search}`;
  const tagsListPath = `/settings/tags${location.search}`;
  const unfilteredTagsListPath = `/settings/tags${withFilterParam(location.search, '')}`;

  const { data: allTags = [] } = useQuery(tagQueries.list());
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [nameInput, setNameInput] = useState(
    tag?.tag ?? sanitiseTagName(filter),
  );
  const [color, setColor] = useState<string | null>(tag?.color ?? null);
  const [description, setDescription] = useState(tag?.description ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [syncedValues, setSyncedValues] = useState(() => getTagValues(tag));

  const name = nameInput.trim();
  const isBusy =
    isSaving || isCreating || isUpdating || isRenaming || isDeleting;

  const tagValues = getTagValues(tag);
  const hasNewTagValues =
    tagValues.name !== syncedValues.name ||
    tagValues.color !== syncedValues.color ||
    tagValues.description !== syncedValues.description;
  if (tag != null && hasNewTagValues && !isBusy) {
    const isDirty =
      name !== syncedValues.name ||
      color !== syncedValues.color ||
      description.trim() !== syncedValues.description;
    setSyncedValues(tagValues);
    if (!isDirty) {
      setNameInput(tagValues.name);
      setColor(tagValues.color);
      setDescription(tagValues.description);
    }
  }

  const duplicate = allTags.find(
    other => other.tag === name && other.id !== tag?.id,
  );
  const isDuplicate = duplicate != null;
  const canSave = name !== '' && !isDuplicate && !isBusy;

  const withUndoReturningTo = async (
    path: string,
    action: () => Promise<void>,
  ) => {
    undo.setUndoState('url', path);
    try {
      await action();
      return true;
    } catch {
      if (isMountedRef.current) {
        undo.setUndoState('url', editPath);
      }
      return false;
    }
  };

  const goTo = (path: string, options?: { replace: boolean }) => {
    if (!isMountedRef.current) {
      return;
    }
    if (options == null) {
      void navigate(path);
    } else {
      void navigate(path, options);
    }
  };

  const onSave = async () => {
    if (!canSave) {
      return;
    }

    const trimmedDescription = description.trim();

    if (tag == null) {
      const isCreated = await withUndoReturningTo(
        unfilteredTagsListPath,
        async () => {
          await createTag({
            tag: { tag: name, color, description: trimmedDescription || null },
          });
        },
      );
      if (!isCreated) {
        return;
      }
      showUndoNotification({
        message: t('Tag "{{name}}" created', { name: `#${name}` }),
      });
      goTo(unfilteredTagsListPath);
      return;
    }

    const hasNewDetails =
      color !== (tag.color ?? null) ||
      trimmedDescription !== (tag.description ?? '');
    const hasNewName = name !== tag.tag;
    let savedCount = 0;

    setIsSaving(true);
    const isSaved = await withUndoReturningTo(tagsListPath, async () => {
      if (hasNewName) {
        await renameTag({ id: tag.id, tag: name });
        savedCount++;
      }
      if (hasNewDetails) {
        await updateTag({
          tag: {
            ...tag,
            tag: name,
            color,
            description: trimmedDescription || null,
          },
        });
        savedCount++;
      }
    });
    if (isMountedRef.current) {
      setIsSaving(false);
    }

    if (savedCount > 0) {
      showUndoNotification({
        message: t('Tag "{{name}}" saved', { name: `#${name}` }),
        ...(savedCount > 1 && {
          button: {
            title: t('Undo'),
            action: async () => {
              await send('undo');
              await send('undo');
            },
          },
        }),
      });
    }
    if (isSaved) {
      goTo(tagsListPath);
    }
  };

  const onDelete = async () => {
    if (tag == null || isBusy) {
      return;
    }
    const isDeleted = await withUndoReturningTo(tagsListPath, async () => {
      await deleteTag({ id: tag.id });
    });
    if (!isDeleted) {
      return;
    }
    showUndoNotification({
      message: t('Tag "{{name}}" deleted', { name: `#${tag.tag}` }),
    });
    goTo(tagsListPath, { replace: true });
  };

  const onViewTransactions = () => {
    if (tag == null) {
      return;
    }
    void navigate('/accounts', {
      state: getTagTransactionsLocationState(tag.tag),
    });
  };

  const onChooseColor = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'tag-color',
          options: { tagName: name, color, onSelect: setColor },
        },
      }),
    );
  };

  return (
    <Page
      header={
        <MobilePageHeader
          title={tag == null ? t('New tag') : t('Edit tag')}
          leftContent={<MobileBackButton onPress={() => navigate(-1)} />}
        />
      }
      footer={
        <View
          style={{
            paddingLeft: styles.mobileEditingPadding,
            paddingRight: styles.mobileEditingPadding,
            paddingTop: 10,
            paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
            backgroundColor: theme.tableHeaderBackground,
            borderTopWidth: 1,
            borderColor: theme.tableBorder,
          }}
        >
          <Button
            variant="primary"
            onPress={onSave}
            isDisabled={!canSave}
            style={{ height: styles.mobileMinHeight }}
          >
            <Trans>Save</Trans>
          </Button>
        </View>
      }
      padding={0}
    >
      <FieldLabel title={t('Name')} />
      <InputField
        aria-label={t('Name')}
        aria-required
        aria-invalid={isDuplicate || undefined}
        aria-describedby={isDuplicate ? errorId : undefined}
        autoFocus={tag == null}
        iconStart={
          <Text aria-hidden style={{ color: theme.pageTextLight }}>
            #
          </Text>
        }
        placeholder={t('Tag name')}
        value={nameInput}
        onChangeValue={value => setNameInput(sanitiseTagNameInput(value))}
        onEnter={onSave}
      />
      {duplicate != null && (
        <Text
          id={errorId}
          role="alert"
          style={{
            color: theme.errorText,
            fontSize: 13,
            marginTop: spacing.xs,
            padding: `0 ${styles.mobileEditingPadding}px`,
          }}
        >
          {duplicate.hidden ? (
            <Trans>A hidden tag with this name already exists.</Trans>
          ) : (
            <Trans>A tag with this name already exists.</Trans>
          )}
        </Text>
      )}

      <FieldLabel title={t('Color')} />
      <TapField
        aria-label={
          color == null
            ? t('Color, theme default')
            : t('Color, {{color}}', { color })
        }
        aria-haspopup="dialog"
        onPress={onChooseColor}
        style={{ gap: spacing.sm }}
      >
        <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
          <span className={getTagCSS('', { color })}>#{name}</span>
        </View>
        <Text style={{ color: theme.pageTextLight, flexShrink: 0 }}>
          {color == null ? <Trans>Theme default</Trans> : color}
        </Text>
      </TapField>

      <FieldLabel title={t('Description')} />
      <InputField
        aria-label={t('Description')}
        placeholder={t('Tag description')}
        value={description}
        onChangeValue={setDescription}
        onEnter={onSave}
        autoCapitalize="sentences"
        autoCorrect="on"
      />

      {tag != null && (
        <View
          style={{
            gap: spacing.xl,
            marginTop: spacing.xl,
            padding: `0 ${spacing.sm}px ${spacing.xl}px`,
          }}
        >
          <Button
            onPress={onViewTransactions}
            style={{ height: styles.mobileMinHeight }}
          >
            <Trans>View transactions</Trans>
          </Button>
          <Button
            onPress={onDelete}
            isDisabled={isBusy}
            style={{
              height: styles.mobileMinHeight,
              color: theme.errorText,
            }}
          >
            <Trans>Delete tag</Trans>
          </Button>
        </View>
      )}
    </Page>
  );
}
