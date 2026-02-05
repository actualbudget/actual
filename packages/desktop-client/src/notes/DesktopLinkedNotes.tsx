import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { isElectron } from 'loot-core/shared/environment';

import { normalizeUrl } from './linkParser';

import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

type DesktopLinkedNotesProps = {
  displayText: string;
  url: string;
  separator: string;
  isFilePath: boolean;
};

const linkStyles = css({
  color: theme.pageTextLink,
  padding: '3px 7px',
  borderRadius: 16,
  userSelect: 'none',
  cursor: 'pointer',
});

export function DesktopLinkedNotes({
  displayText,
  url,
  separator,
  isFilePath,
}: DesktopLinkedNotesProps) {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const handleClick = async () => {
    if (isFilePath) {
      if (isElectron()) {
        // Open file in file manager
        window.Actual?.openInFileManager(url);
      } else {
        // Browser fallback: copy to clipboard
        await navigator.clipboard.writeText(url);
        dispatch(
          addNotification({
            notification: {
              type: 'message',
              message: t('File path copied to clipboard'),
            },
          }),
        );
      }
    } else {
      // Open URL in browser
      const normalizedUrl = normalizeUrl(url);
      window.Actual?.openURLInBrowser(normalizedUrl);
    }
  };

  return (
    <View style={{ display: 'inline-flex' }}>
      <Button variant="bare" style={linkStyles} onPress={handleClick}>
        {displayText}
      </Button>
      {separator}
    </View>
  );
}
