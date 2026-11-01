import { useTranslation } from 'react-i18next';

import {
  SvgSearchAlternate,
  SvgViewHide,
  SvgViewShow,
} from '@actual-app/components/icons/v2';

import { PageMenuButton } from '#components/common/PageMenuButton';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useDiscoverTagsMutation } from '#tags';

type Actions = 'set-dont-show-hidden' | 'set-show-hidden' | 'discover-tags';

export function TagsMenuButton() {
  const { t } = useTranslation();
  const { mutate: discoverTags } = useDiscoverTagsMutation();
  const [showHidden, setShowHidden] = useSyncedPref('show-hidden-tags');

  return (
    <PageMenuButton<Actions>
      items={[
        showHidden === 'true'
          ? {
              name: 'set-dont-show-hidden',
              text: t("Don't show hidden tags"),
              icon: SvgViewHide,
            }
          : {
              name: 'set-show-hidden',
              text: t('Show hidden tags'),
              icon: SvgViewShow,
            },
        {
          name: 'discover-tags',
          text: t('Discover new tags'),
          icon: SvgSearchAlternate,
        },
      ]}
      onMenuSelect={name => {
        if (name === 'set-dont-show-hidden') {
          setShowHidden('false');
        } else if (name === 'set-show-hidden') {
          setShowHidden('true');
        } else if (name === 'discover-tags') {
          discoverTags();
        }
      }}
    />
  );
}
