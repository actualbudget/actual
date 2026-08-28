import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { Link } from '#components/common/Link';
import { Markdown } from '#components/common/Markdown';
import { Setting } from '#components/settings/UI';
import { useDateFormat } from '#hooks/useDateFormat';
import { useLocale } from '#hooks/useLocale';
import { admonitionsToBlockquotes } from '#news/admonitions';
import type { NewsEntry } from '#news/types';

import { MarkdownBlockquote } from './MarkdownBlockquote';

const markdownComponents = { blockquote: MarkdownBlockquote };

const markdownStyle = {
  '& h2, & h3, & h4': { fontSize: 14, fontWeight: 600, margin: '14px 0 6px' },
  '& img': { maxWidth: '100%' },
};

type NewsEntryCardProps = {
  entry: NewsEntry;
  isUnread: boolean;
};

export function NewsEntryCard({ entry, isUnread }: NewsEntryCardProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [isShowingDetails, setIsShowingDetails] = useState(false);
  const isRelease = entry.type === 'release';

  return (
    // The settings card is reused on purpose so this page matches Settings.
    <Setting style={{ alignItems: 'stretch' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <Text
          style={{
            ...styles.editorPill,
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            color: isRelease ? theme.noticeText : theme.pillTextSelected,
            backgroundColor: isRelease
              ? theme.noticeBackground
              : theme.pillBackgroundSelected,
          }}
        >
          {isRelease ? t('Release') : t('Post')}
        </Text>
        <Text style={{ fontWeight: 600, fontSize: 16, flex: 1 }}>
          {entry.title}
        </Text>
        {isUnread && (
          <View
            role="img"
            aria-label={t('Unread')}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: theme.pageTextPositive,
            }}
          />
        )}
        <Text style={{ fontSize: 12 }}>
          {monthUtils.format(entry.date, dateFormat, locale)}
        </Text>
      </View>

      <Markdown style={markdownStyle} components={markdownComponents}>
        {admonitionsToBlockquotes(entry.body)}
      </Markdown>

      {entry.details && isShowingDetails && (
        <Markdown style={markdownStyle} components={markdownComponents}>
          {admonitionsToBlockquotes(entry.details)}
        </Markdown>
      )}

      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          alignItems: 'center',
          fontSize: 13,
        }}
      >
        {entry.details && (
          <Link
            variant="text"
            onClick={() => setIsShowingDetails(!isShowingDetails)}
            style={{ color: theme.pageTextPositive }}
          >
            {isShowingDetails ? t('Hide all changes') : t('Show all changes')}
          </Link>
        )}
        <Link variant="external" to={entry.url} linkColor="purple">
          {isRelease ? (
            <Trans>View on actualbudget.org</Trans>
          ) : (
            <Trans>Read the full post</Trans>
          )}
        </Link>
      </View>
    </Setting>
  );
}
