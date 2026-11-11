import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useHoverMenu } from '@actual-app/components/hooks/useHoverMenu';
import { SvgDotsHorizontalTriple } from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import type { MenuItem } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { View } from '@actual-app/components/view';

type PageMenuButtonProps<Name extends string> = {
  'data-testid'?: string;
  items: Array<MenuItem<Name>>;
  onMenuSelect: (name: Name) => void;
};

export function PageMenuButton<Name extends string>({
  'data-testid': testId,
  items,
  onMenuSelect,
}: PageMenuButtonProps<Name>) {
  const { t } = useTranslation();
  const menu = useHoverMenu();

  return (
    <View style={{ flexShrink: 0 }}>
      <Button
        ref={menu.triggerRef}
        data-testid={testId}
        {...menu.triggerProps}
        variant="bare"
        aria-label={t('Menu')}
        onPress={menu.toggle}
      >
        <SvgDotsHorizontalTriple width={17} height={17} />
      </Button>
      <Popover {...menu.popoverProps}>
        <Menu
          items={items}
          onMenuSelect={name => {
            menu.close();
            onMenuSelect(name);
          }}
        />
      </Popover>
    </View>
  );
}
