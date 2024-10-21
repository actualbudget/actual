import { forwardRef, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Trans, useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { useToggle } from 'usehooks-ts';

import { openDocsForCurrentPage } from 'loot-core/client/actions';
import { pushModal } from 'loot-core/client/actions/modals';

import { SvgHelp } from '../icons/v2/Help';

import { Button } from './common/Button2';
import { Menu } from './common/Menu';
import { Popover } from './common/Popover';
import { SpaceBetween } from './common/SpaceBetween';

type HelpMenuItem = 'docs' | 'keyboard-shortcuts';

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
  const { t } = useTranslation();
  const [isMenuOpen, toggleMenuOpen, setMenuOpen] = useToggle();
  const menuButtonRef = useRef(null);

  const dispatch = useDispatch();

  const handleItemSelect = (item: HelpMenuItem) => {
    switch (item) {
      case 'docs':
        dispatch(openDocsForCurrentPage());
        break;
      case 'keyboard-shortcuts':
        dispatch(pushModal('keyboard-shortcuts'));
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
          onMenuSelect={item => {
            setMenuOpen(false);
            handleItemSelect(item);
          }}
          items={[
            {
              name: 'docs',
              text: t('Documentation'),
            },
            { name: 'keyboard-shortcuts', text: t('Keyboard shortcuts') },
          ]}
        />
      </Popover>
    </SpaceBetween>
  );
};
