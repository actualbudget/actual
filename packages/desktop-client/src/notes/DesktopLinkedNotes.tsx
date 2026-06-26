import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { isElectron } from '@actual-app/core/shared/environment';

import { Link } from '#components/common/Link';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

import { normalizeUrl } from './linkParser';

type DesktopLinkedNotesProps = {
  displayText: string;
  url: string;
  separator: string;
  isFilePath: boolean;
};

export function DesktopLinkedNotes({
  displayText,
  url,
  separator,
  isFilePath,
}: DesktopLinkedNotesProps) {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const handleClick = async (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

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
    <>
      <Link
        variant="text"
        onClick={handleClick}
        style={{
          color: theme.pageTextLink,
          textDecoration: 'underline',
          cursor: 'pointer',
          '&:hover': {
            color: theme.pageTextLinkLight,
          },
        }}
      >
        {displayText}
      </Link>
      {separator}
    </>
  );
}
