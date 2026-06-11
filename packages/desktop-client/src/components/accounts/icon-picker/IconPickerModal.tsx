import { useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { FormError } from '@actual-app/components/form-error';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { isElectron } from '@actual-app/core/shared/environment';
import { useQueryClient } from '@tanstack/react-query';

import { accountQueries } from '#accounts';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '#components/common/Modal';
import { useServerURL } from '#components/ServerContext';
import { useAccount } from '#hooks/useAccount';
import type { Modal as ModalType } from '#modals/modalsSlice';

import {
  emojiToDataUrl,
  IconNormalizationError,
  normalizeImageToDataUrl,
  toDataUrl,
} from './normalizeIcon';

type IconPickerModalProps = Extract<
  ModalType,
  { name: 'account-icon-picker' }
>['options'];

type PostErrorLike = { reason: string; type?: string };

function isPostError(err: unknown): err is PostErrorLike {
  if (typeof err !== 'object' || err === null) {
    return false;
  }
  if (!('reason' in err)) {
    return false;
  }
  if (typeof Reflect.get(err, 'reason') !== 'string') {
    return false;
  }
  if (!('type' in err)) {
    return true;
  }
  return Reflect.get(err, 'type') === 'PostError';
}

function iconPersistErrorMessage(
  err: unknown,
  t: (key: string) => string,
  fallbackKey: string,
): string {
  if (isPostError(err)) {
    const { reason } = err;
    if (reason === 'invalid-image-icon') {
      return t(
        'The image could not be processed. Try another PNG or JPEG file.',
      );
    }
    if (reason === 'icon-too-large') {
      return t('The image is too large after processing. Try a smaller file.');
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return t(fallbackKey);
}

type Tab = 'favicon' | 'upload' | 'emoji';
type Scope = 'account' | 'bank';

const PREVIEW_SIZE = 64;
const SUGGESTED_EMOJI = [
  '🏦',
  '💳',
  '💰',
  '💵',
  '💸',
  '🏠',
  '🚗',
  '🛒',
  '🍔',
  '✈️',
  '🎓',
  '💼',
  '📈',
  '📊',
  '🪙',
  '💎',
  '🧾',
  '📱',
];

export function IconPickerModal({ accountId, onClose }: IconPickerModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const account = useAccount(accountId);
  const serverURL = useServerURL();

  // Favicon fetch uses the sync server proxy in web contexts. In Electron the
  // loot-core server can fetch directly, so no external server is required.
  const hasFaviconProxy = !!serverURL || isElectron();

  const [tab, setTab] = useState<Tab>(hasFaviconProxy ? 'favicon' : 'upload');
  const [scope, setScope] = useState<Scope>('account');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [previewIcon, setPreviewIcon] = useState<string | null>(null);
  const [pendingWebsite, setPendingWebsite] = useState<string | null>(null);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setPreviewIcon(null);
    setPendingWebsite(null);
    setError(null);
  };

  if (!account) return null;

  const effectiveIcon = account.displayIcon;
  const effectiveWebsite = account.displayWebsite;
  const canEditBank = !!account.bank;
  const canClear =
    scope === 'bank' ? !!account.bank && !!account.bankIcon : !!account.icon;

  const refresh = () => {
    void queryClient.invalidateQueries({
      queryKey: accountQueries.list().queryKey,
    });
  };

  const persistAll = async ({
    icon,
    website,
  }: {
    icon?: string | null;
    website?: string | null;
  }) => {
    await send('account-icon-picker-save', {
      scope,
      accountId: account.id,
      bankId: scope === 'bank' ? (account.bank ?? undefined) : undefined,
      icon,
      website,
    });
    refresh();
  };

  return (
    <Modal
      name="account-icon-picker"
      onClose={onClose}
      containerProps={{ style: { width: 400 } }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={<ModalTitle title={t('Account icon')} shrinkOnOverflow />}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />

          <View style={{ padding: 12, gap: 16 }}>
            <CurrentIconPreview
              icon={previewIcon ?? effectiveIcon}
              accountName={account.name}
              isBusy={isBusy}
            />

            {canEditBank && (
              <ScopeSwitch
                scope={scope}
                onChange={setScope}
                bankName={account.bankName}
              />
            )}

            <TabSwitch tab={tab} onChange={handleTabChange} />

            {tab === 'favicon' && (
              <FaviconTab
                initialUrl={effectiveWebsite ?? ''}
                hasFaviconProxy={hasFaviconProxy}
                isBusy={isBusy}
                setIsBusy={setIsBusy}
                setError={setError}
                setPreview={setPreviewIcon}
                setPendingWebsite={setPendingWebsite}
              />
            )}

            {tab === 'upload' && (
              <UploadTab
                setError={setError}
                setIsBusy={setIsBusy}
                setPreview={setPreviewIcon}
                isBusy={isBusy}
              />
            )}

            {tab === 'emoji' && (
              <EmojiTab setError={setError} setPreview={setPreviewIcon} />
            )}

            {error && (
              <FormError style={{ color: theme.errorText }}>{error}</FormError>
            )}

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <Button
                isDisabled={isBusy || !canClear}
                onPress={async () => {
                  if (!canClear) {
                    return;
                  }
                  setError(null);
                  setIsBusy(true);
                  try {
                    await persistAll({ icon: null });
                    state.close();
                  } catch (err) {
                    setError(
                      iconPersistErrorMessage(err, t, 'Failed to clear icon'),
                    );
                  } finally {
                    setIsBusy(false);
                  }
                }}
              >
                {scope === 'bank' ? (
                  <Trans>Clear bank icon</Trans>
                ) : account.icon ? (
                  <Trans>Clear override</Trans>
                ) : (
                  <Trans>Clear icon</Trans>
                )}
              </Button>
              <Button
                variant="primary"
                isDisabled={isBusy || !previewIcon}
                onPress={async () => {
                  if (!previewIcon) return;
                  setError(null);
                  setIsBusy(true);
                  try {
                    await persistAll({
                      icon: previewIcon,
                      website: pendingWebsite ?? undefined,
                    });
                    state.close();
                  } catch (err) {
                    setError(
                      iconPersistErrorMessage(err, t, 'Failed to save icon'),
                    );
                  } finally {
                    setIsBusy(false);
                  }
                }}
              >
                <Trans>Apply</Trans>
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}

function CurrentIconPreview({
  icon,
  accountName,
  isBusy,
}: {
  icon: string | null;
  accountName: string;
  isBusy: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 8,
        backgroundColor: theme.tableBackground,
        borderRadius: 6,
      }}
    >
      <View
        style={{
          width: PREVIEW_SIZE,
          height: PREVIEW_SIZE,
          borderRadius: 6,
          border: `1px solid ${theme.tableBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.pageBackground,
          overflow: 'hidden',
        }}
      >
        {isBusy ? (
          <AnimatedLoading
            width={24}
            height={24}
            style={{ color: theme.pageTextSubdued }}
          />
        ) : icon ? (
          <img
            src={icon}
            alt=""
            width={PREVIEW_SIZE}
            height={PREVIEW_SIZE}
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <Text style={{ color: theme.pageTextSubdued, fontSize: 12 }}>
            <Trans>No icon</Trans>
          </Text>
        )}
      </View>
      <View>
        <Text style={{ ...styles.mediumText, fontWeight: 500 }}>
          {accountName}
        </Text>
        <Text style={{ color: theme.pageTextSubdued, fontSize: 12 }}>
          <Trans>Preview</Trans>
        </Text>
      </View>
    </View>
  );
}

function ScopeSwitch({
  scope,
  onChange,
  bankName,
}: {
  scope: Scope;
  onChange: (s: Scope) => void;
  bankName: string | null;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Button
        variant={scope === 'account' ? 'primary' : 'normal'}
        onPress={() => onChange('account')}
      >
        <Trans>This account</Trans>
      </Button>
      <Button
        variant={scope === 'bank' ? 'primary' : 'normal'}
        onPress={() => onChange('bank')}
      >
        {bankName ? (
          <Trans>All accounts at {{ bankName }}</Trans>
        ) : (
          <Trans>All accounts at this bank</Trans>
        )}
      </Button>
    </View>
  );
}

function TabSwitch({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Button
        variant={tab === 'favicon' ? 'primary' : 'normal'}
        onPress={() => onChange('favicon')}
      >
        <Trans>Favicon</Trans>
      </Button>
      <Button
        variant={tab === 'upload' ? 'primary' : 'normal'}
        onPress={() => onChange('upload')}
      >
        <Trans>Upload</Trans>
      </Button>
      <Button
        variant={tab === 'emoji' ? 'primary' : 'normal'}
        onPress={() => onChange('emoji')}
      >
        <Trans>Emoji</Trans>
      </Button>
    </View>
  );
}

function FaviconTab({
  initialUrl,
  hasFaviconProxy,
  isBusy,
  setIsBusy,
  setError,
  setPreview,
  setPendingWebsite,
}: {
  initialUrl: string;
  hasFaviconProxy: boolean;
  isBusy: boolean;
  setIsBusy: (b: boolean) => void;
  setError: (e: string | null) => void;
  setPreview: (s: string | null) => void;
  setPendingWebsite: (s: string | null) => void;
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState(initialUrl);

  if (!hasFaviconProxy) {
    return (
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 12, color: theme.pageTextSubdued }}>
          <Trans>
            Auto-favicon requires a connected sync server, which fetches the
            icon and embeds it locally. Without a sync server, please use the
            Upload or Emoji tab instead.
          </Trans>
        </Text>
      </View>
    );
  }

  const handleFetch = async () => {
    if (!url.trim()) {
      setError(t('Enter a website URL first'));
      return;
    }
    setError(null);
    setIsBusy(true);
    setPreview(null);
    setPendingWebsite(null);
    try {
      const result = await send('favicon-fetch', { url });
      const raw = toDataUrl(result.contentType, result.base64);
      const normalized = await normalizeImageToDataUrl(raw);
      setPreview(normalized);
      setPendingWebsite(url.trim());
    } catch (err) {
      const message =
        err instanceof IconNormalizationError
          ? err.message
          : err instanceof Error
            ? err.message
            : t('Failed to fetch favicon');
      setError(message);
      setPreview(null);
      setPendingWebsite(null);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 12, color: theme.pageTextSubdued }}>
        <Trans>
          Enter a bank or institution URL. The favicon will be fetched and
          embedded locally so it works offline.
        </Trans>
      </Text>
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          alignItems: 'stretch',
        }}
      >
        <Input
          placeholder={t('https://example.com')}
          value={url}
          onChangeValue={setUrl}
          style={{
            flex: 1,
            minWidth: 0,
            flexShrink: 1,
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
        <Button isDisabled={isBusy} onPress={handleFetch} style={{ flex: 1 }}>
          <Trans>Fetch favicon</Trans>
        </Button>
      </View>
    </View>
  );
}

function UploadTab({
  isBusy,
  setError,
  setIsBusy,
  setPreview,
}: {
  isBusy: boolean;
  setError: (e: string | null) => void;
  setIsBusy: (b: boolean) => void;
  setPreview: (s: string | null) => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 12, color: theme.pageTextSubdued }}>
        <Trans>
          Upload an image. It will be resized to 64x64 pixels and stored inline.
        </Trans>
      </Text>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={async e => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          setError(null);
          setIsBusy(true);
          try {
            const dataUrl = await normalizeImageToDataUrl(file);
            setPreview(dataUrl);
          } catch (err) {
            const message =
              err instanceof IconNormalizationError
                ? err.message
                : err instanceof Error
                  ? err.message
                  : t('Failed to process image');
            setError(message);
            setPreview(null);
          } finally {
            setIsBusy(false);
          }
        }}
      />
      <Button isDisabled={isBusy} onPress={() => inputRef.current?.click()}>
        <Trans>Choose image</Trans>
      </Button>
    </View>
  );
}

function EmojiTab({
  setError,
  setPreview,
}: {
  setError: (e: string | null) => void;
  setPreview: (s: string | null) => void;
}) {
  const { t } = useTranslation();
  const [emoji, setEmoji] = useState('');

  function handleEmoji(value: string) {
    setEmoji(value);
    try {
      if (!value.trim()) {
        setPreview(null);
        return;
      }
      const dataUrl = emojiToDataUrl(value);
      setPreview(dataUrl);
      setError(null);
    } catch (err) {
      const message =
        err instanceof IconNormalizationError
          ? err.message
          : t('Failed to render emoji');
      setError(message);
      setPreview(null);
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 12, color: theme.pageTextSubdued }}>
        <Trans>Pick a suggested emoji or paste any character.</Trans>
      </Text>
      <View
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(9, 1fr)',
          gap: 4,
        }}
      >
        {SUGGESTED_EMOJI.map(em => (
          <Button
            key={em}
            variant={emoji === em ? 'primary' : 'normal'}
            onPress={() => handleEmoji(em)}
            style={{ fontSize: 22, padding: 4 }}
          >
            {em}
          </Button>
        ))}
      </View>
      <Input
        placeholder={t('Paste any emoji')}
        value={emoji}
        onChangeValue={handleEmoji}
        style={{ textAlign: 'center', fontSize: 22 }}
        autoComplete="off"
      />
    </View>
  );
}
