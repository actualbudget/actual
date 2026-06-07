import { Trans } from 'react-i18next';

import { SvgAlertTriangle } from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { isElectron } from '@actual-app/core/shared/environment';
import { css } from '@emotion/css';

import { Link } from '#components/common/Link';

export function SharedArrayBufferWarning() {
  const requiresSharedArrayBuffer =
    !isElectron() && typeof SharedArrayBuffer !== 'undefined';

  // Only show warning if SharedArrayBuffer is required and not supported
  if (requiresSharedArrayBuffer) {
    return null;
  }

  return (
    <Tooltip
      placement="bottom start"
      content={
        <Trans>
          Your environment does not support SharedArrayBuffer. You may
          experience data loss or degraded functionality. Click to learn more.
        </Trans>
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
        to="https://actualbudget.org/docs/troubleshooting/shared-array-buffer"
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
