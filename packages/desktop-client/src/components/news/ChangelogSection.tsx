import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgCheveronDown,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { View } from '@actual-app/components/view';

import type { ChangelogSection as ChangelogSectionData } from '#news/changelog';

import { NewsMarkdown } from './NewsMarkdown';

// Every change starts with a link to its pull request. Underlining all of
// them makes the list hard to scan, so they only underline when pointed at.
const changeListStyle = {
  '& li > a[href*="/pull/"]': { textDecoration: 'none' },
  '& li > a[href*="/pull/"]:hover, & li > a[href*="/pull/"]:focus-visible': {
    textDecoration: 'underline',
  },
};

type ChangelogSectionProps = Pick<
  ChangelogSectionData,
  'title' | 'markdown' | 'changeCount'
>;

/** One category of a release's changes, collapsed until asked for. */
export function ChangelogSection({
  title,
  markdown,
  changeCount,
}: ChangelogSectionProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();
  const Chevron = isOpen ? SvgCheveronDown : SvgCheveronRight;

  return (
    <View>
      <Button
        variant="bare"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        onPress={() => setIsOpen(!isOpen)}
        style={{
          alignSelf: 'flex-start',
          gap: 6,
          // Lines the chevron up with the card's text edge.
          marginLeft: -5,
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        <Chevron width={12} height={12} aria-hidden />
        {t('{{title}} ({{changeCount}})', { title, changeCount })}
      </Button>
      {isOpen && (
        <View id={listId} style={{ paddingLeft: 18, paddingBottom: 8 }}>
          <NewsMarkdown style={changeListStyle}>{markdown}</NewsMarkdown>
        </View>
      )}
    </View>
  );
}
