import { Trans } from 'react-i18next';

import { SvgAlertTriangle } from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';

import { Link } from '#components/common/Link';

export function SharedArrayBufferWarning() {
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';

  // Only show warning if SharedArrayBuffer is not supported
  if (hasSharedArrayBuffer) {
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
        styles={{ color: theme.warningText, textDecoration: 'none' }}
      >
        <Trans>Warning</Trans>
        <SvgAlertTriangle width={13} style={{ marginLeft: '6px' }} />
      </Link>
    </Tooltip>
  );
}
