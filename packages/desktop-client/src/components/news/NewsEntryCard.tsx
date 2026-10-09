import { VisuallyHidden } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { Link } from '#components/common/Link';
import { Setting } from '#components/settings/UI';
import { useDateFormat } from '#hooks/useDateFormat';
import { useLocale } from '#hooks/useLocale';
import { countChanges, splitChangelog } from '#news/changelog';
import type { NewsEntry } from '#news/types';

import { ChangelogSection } from './ChangelogSection';
import { NewsMarkdown } from './NewsMarkdown';

// The release tooling titles release posts "Release X.Y.Z". The pill beside
// the title already says "Release", so only the version is shown.
function getDisplayTitle(entry: NewsEntry): string {
  return entry.type === 'release'
    ? entry.title.replace(/^Release\s+/, '')
    : entry.title;
}

type NewsEntryCardProps = {
  entry: NewsEntry;
  isUnread: boolean;
};

export function NewsEntryCard({ entry, isUnread }: NewsEntryCardProps) {
  const locale = useLocale();
  // The date format chosen in Settings, as used everywhere else in the app.
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
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
          {isRelease ? (
            <Trans>Release</Trans>
          ) : (
            <Trans context="news">Post</Trans>
          )}
        </Text>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, flex: 1 }}>
          {getDisplayTitle(entry)}
        </h2>
        {isUnread && (
          <>
            <View
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: theme.pageTextPositive,
              }}
            />
            <VisuallyHidden>
              <Trans>Unread</Trans>
            </VisuallyHidden>
          </>
        )}
        <time dateTime={entry.date} style={{ fontSize: 12 }}>
          {monthUtils.format(entry.date, dateFormat, locale)}
        </time>
      </View>

      <NewsMarkdown>{entry.body}</NewsMarkdown>

      {entry.details && <AllChanges details={entry.details} />}

      <Text style={{ fontSize: 13 }}>
        <Link variant="external" to={entry.url} linkColor="purple">
          {isRelease ? (
            <Trans>View on actualbudget.org</Trans>
          ) : (
            <Trans>Read the full post</Trans>
          )}
        </Link>
      </Text>
    </Setting>
  );
}

/** The full list of a release's changes, one collapsed section per category. */
function AllChanges({ details }: { details: string }) {
  const { t } = useTranslation();
  const { preamble, sections } = splitChangelog(details);

  return (
    <View
      style={{
        gap: 2,
        paddingTop: 12,
        borderTop: `1px solid ${theme.pillBorderDark}`,
      }}
    >
      <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600 }}>
        <Trans>All changes</Trans>
      </h3>
      {sections.length === 0 ? (
        // Older release notes aren't split into categories.
        <ChangelogSection
          title={t('Changes')}
          markdown={preamble}
          changeCount={countChanges(preamble)}
        />
      ) : (
        <>
          {preamble && <NewsMarkdown>{preamble}</NewsMarkdown>}
          {sections.map(section => (
            <ChangelogSection key={section.title} {...section} />
          ))}
        </>
      )}
    </View>
  );
}
