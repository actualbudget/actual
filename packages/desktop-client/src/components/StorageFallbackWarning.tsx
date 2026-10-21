import { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';

import { SvgAlertTriangle } from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import type { StorageBackend } from '@actual-app/core/platform/client/browser-preload';
import { send } from '@actual-app/core/platform/client/connection';
import { isElectron } from '@actual-app/core/shared/environment';
import { css } from '@emotion/css';

import { Link } from '#components/common/Link';

const STORAGE_DOCS_URL =
  'https://actualbudget.org/docs/troubleshooting/browser-storage';
const SHARED_ARRAY_BUFFER_DOCS_URL =
  'https://actualbudget.org/docs/troubleshooting/shared-array-buffer';

/**
 * Title bar warning for budgets that are not on the fast path: the
 * sqlite-wasm engine fell back to memory plus IndexedDB because the browser
 * has no sync access handles, or the previous engine runs without
 * SharedArrayBuffer.
 */
export function StorageFallbackWarning() {
  const [backend, setBackend] = useState<StorageBackend | null>(null);

  useEffect(() => {
    if (isElectron()) {
      return;
    }
    let isCancelled = false;
    void send('storage-info').then(info => {
      if (!isCancelled) {
        setBackend(info.backend);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  const isFallback = backend === 'memory-idb';
  const isLegacyWithoutSharedArrayBuffer =
    backend === 'legacy' && typeof SharedArrayBuffer === 'undefined';
  if (isElectron() || (!isFallback && !isLegacyWithoutSharedArrayBuffer)) {
    return null;
  }

  return (
    <Tooltip
      placement="bottom start"
      content={
        isFallback ? (
          <Trans>
            This browser cannot use Actual's faster storage, so budgets are kept
            in memory and saved about once a second. Keep a budget open in one
            tab at a time. Click to learn more.
          </Trans>
        ) : (
          <Trans>
            Your environment does not support SharedArrayBuffer. You may
            experience data loss or degraded functionality. Click to learn more.
          </Trans>
        )
      }
      style={{
        ...styles.tooltip,
        lineHeight: 1.5,
        padding: '6px 10px',
        marginTop: '10px',
        width: '300px',
      }}
    >
      <Link
        variant="external"
        to={isFallback ? STORAGE_DOCS_URL : SHARED_ARRAY_BUFFER_DOCS_URL}
        className={css({
          color: `${theme.warningText} !important`,
          textDecoration: 'none',
          padding: '4px 6px',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          ':hover': { backgroundColor: theme.buttonBareBackgroundHover },
        })}
      >
        <Trans>Warning</Trans>
        <SvgAlertTriangle width={13} style={{ marginLeft: '6px' }} />
      </Link>
    </Tooltip>
  );
}
