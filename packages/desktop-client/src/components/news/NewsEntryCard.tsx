import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';
import { format as formatDate, parseISO } from 'date-fns';
import rehypeExternalLinks from 'rehype-external-links';
import remarkGfm from 'remark-gfm';

import { Link } from '#components/common/Link';
import { Setting } from '#components/settings/UI';
import { useDateFormat } from '#hooks/useDateFormat';
import { admonitionsToBlockquotes } from '#news/admonitions';
import type { NewsEntry } from '#news/types';
import {
  markdownBaseStyles,
  remarkBreaks,
  sequentialNewlinesPlugin,
} from '#util/markdown';

import { MarkdownBlockquote } from './MarkdownBlockquote';

const remarkPlugins = [sequentialNewlinesPlugin, remarkGfm, remarkBreaks];
const rehypePlugins = [
  [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
] satisfies Parameters<typeof ReactMarkdown>[0]['rehypePlugins'];
const markdownComponents = { blockquote: MarkdownBlockquote };

const markdownStyles = css(markdownBaseStyles, {
  display: 'block',
  '& h2, & h3, & h4': { fontSize: 14, fontWeight: 600, margin: '14px 0 6px' },
  '& img': { maxWidth: '100%' },
});

type NewsEntryCardProps = {
  entry: NewsEntry;
  isUnread: boolean;
};

export function NewsEntryCard({ entry, isUnread }: NewsEntryCardProps) {
  const { t } = useTranslation();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const hasDetails = Boolean(entry.details);
  const [isShowingDetails, setIsShowingDetails] = useState(false);

  return (
    <View data-testid={`whats-new-entry-${entry.id}`}>
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
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              padding: '1px 6px',
              borderRadius: 4,
              backgroundColor:
                entry.type === 'release'
                  ? theme.noticeBackground
                  : theme.pillBackgroundSelected,
              color:
                entry.type === 'release'
                  ? theme.noticeText
                  : theme.pillTextSelected,
            }}
          >
            {entry.type === 'release' ? t('Release') : t('Post')}
          </Text>
          <Text style={{ fontWeight: 600, fontSize: 16, flex: 1 }}>
            {entry.title}
          </Text>
          {isUnread && (
            <Text
              aria-label={t('Unread')}
              title={t('Unread')}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: theme.pageTextPositive,
              }}
            />
          )}
          <Text style={{ fontSize: 12 }}>
            {formatDate(parseISO(entry.date), dateFormat)}
          </Text>
        </View>

        <Text className={markdownStyles}>
          <ReactMarkdown
            remarkPlugins={remarkPlugins}
            rehypePlugins={rehypePlugins}
            components={markdownComponents}
          >
            {admonitionsToBlockquotes(entry.body)}
          </ReactMarkdown>
        </Text>

        {hasDetails && isShowingDetails && (
          <Text className={markdownStyles} data-testid="whats-new-details">
            <ReactMarkdown
              remarkPlugins={remarkPlugins}
              rehypePlugins={rehypePlugins}
              components={markdownComponents}
            >
              {admonitionsToBlockquotes(entry.details ?? '')}
            </ReactMarkdown>
          </Text>
        )}

        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            alignItems: 'center',
            fontSize: 13,
          }}
        >
          {hasDetails && (
            <Button
              variant="bare"
              onPress={() => setIsShowingDetails(!isShowingDetails)}
            >
              {isShowingDetails ? t('Hide all changes') : t('Show all changes')}
            </Button>
          )}
          <Link variant="external" to={entry.url} linkColor="purple">
            {entry.type === 'release' ? (
              <Trans>View on actualbudget.org</Trans>
            ) : (
              <Trans>Read the full post</Trans>
            )}
          </Link>
        </View>
      </Setting>
    </View>
  );
}
