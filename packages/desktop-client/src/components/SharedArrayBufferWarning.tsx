import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAlertTriangle } from '@actual-app/components/icons/v2';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';

export function SharedArrayBufferWarning() {
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';

  // Only show warning if SharedArrayBuffer is not supported
  if (hasSharedArrayBuffer) {
    return null;
  }

  const handlePress = () => {
    window.open(
      'https://actualbudget.org/docs/troubleshooting/shared-array-buffer',
      '_blank',
      'noopener,noreferrer',
    );
  };

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
        lineHeight: 1.5,
        padding: '6px 10px',
        width: '300px',
      }}
    >
      <Button
        variant="bare"
        style={{ color: theme.warningText }}
        onPress={handlePress}
      >
        <Trans>Warning</Trans>
        <SvgAlertTriangle width={13} style={{ marginLeft: '6px' }} />
      </Button>
    </Tooltip>
  );
}
