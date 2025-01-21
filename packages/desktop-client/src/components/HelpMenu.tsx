import { forwardRef, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { useToggle } from 'usehooks-ts';

import { pushModal } from 'loot-core/client/modals/modalsSlice';

import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { SvgHelp } from '../icons/v2/Help';
import { useDispatch } from '../redux';

import { Button } from './common/Button2';
import { Menu } from './common/Menu';
import { Popover } from './common/Popover';
import { SpaceBetween } from './common/SpaceBetween';

const getPageDocs = (page: string) => {
  switch (page) {
    case '/budget':
      return 'https://actualbudget.org/docs/getting-started/envelope-budgeting';
    case '/reports':
      return 'https://actualbudget.org/docs/reports/';
    case '/schedules':
      return 'https://actualbudget.org/docs/schedules';
    case '/payees':
      return 'https://actualbudget.org/docs/transactions/payees';
    case '/rules':
      return 'https://actualbudget.org/docs/budgeting/rules';
    case '/settings':
      return 'https://actualbudget.org/docs/settings';
    default:
      // All pages under /accounts, plus any missing pages
      return 'https://actualbudget.org/docs';
  }
};

function openDocsForCurrentPage() {
  window.Actual.openURLInBrowser(getPageDocs(window.location.pathname));
}

type HelpMenuItem = 'docs' | 'keyboard-shortcuts' | 'goal-templates';

type HelpButtonProps = {
  onPress?: () => void;
};

const HelpButton = forwardRef<HTMLButtonElement, HelpButtonProps>(
  ({ onPress }, ref) => {
    const size = 15;
    return (
      <Button
        variant="bare"
        ref={ref}
        onPress={onPress}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <SvgHelp width={size} height={size} />
        <Trans>Help</Trans>
      </Button>
    );
  },
);

HelpButton.displayName = 'HelpButton';

export const HelpMenu = () => {
  const showGoalTemplates = useFeatureFlag('goalTemplatesEnabled');
  const { t } = useTranslation();
  const [isMenuOpen, toggleMenuOpen, setMenuOpen] = useToggle();
  const menuButtonRef = useRef(null);

  const dispatch = useDispatch();
  const page = useLocation().pathname;

  const handleItemSelect = (item: HelpMenuItem) => {
    switch (item) {
      case 'docs':
        openDocsForCurrentPage();
        break;
      case 'keyboard-shortcuts':
        dispatch(pushModal({ modal: { name: 'keyboard-shortcuts' } }));
        break;
      case 'goal-templates':
        dispatch(pushModal({ modal: { name: 'goal-templates' } }));
        break;
    }
  };

  useHotkeys('shift+?', () => setMenuOpen(true));

  return (
    <SpaceBetween>
      <HelpButton ref={menuButtonRef} onPress={toggleMenuOpen} />

      <Popover
        placement="bottom end"
        offset={8}
        triggerRef={menuButtonRef}
        isOpen={isMenuOpen}
        onOpenChange={() => setMenuOpen(false)}
      >
        <Menu
          onMenuSelect={(item: HelpMenuItem) => {
            setMenuOpen(false);
            handleItemSelect(item);
          }}
          items={[
            {
              name: 'docs',
              text: t('Documentation'),
            },
            { name: 'keyboard-shortcuts', text: t('Keyboard shortcuts') },
            ...(showGoalTemplates && page === '/budget'
              ? [{ name: 'goal-templates', text: t('Goal templates') }]
              : []),
          ]}
        />
      </Popover>
    </SpaceBetween>
  );
};
