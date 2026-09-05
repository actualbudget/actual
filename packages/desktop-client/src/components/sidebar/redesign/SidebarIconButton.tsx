import type { ComponentProps, ComponentType, SVGProps } from 'react';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';
import { radius } from '@actual-app/components/tokens';
import { css } from '@emotion/css';

type SidebarIconButtonProps = {
  Icon:
    | ComponentType<SVGProps<SVGElement>>
    | ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  isToggledOn?: boolean;
  isDisabled?: boolean;
  onPress: ComponentProps<typeof Button>['onPress'];
};

export function SidebarIconButton({
  Icon,
  label,
  isToggledOn,
  isDisabled,
  onPress,
}: SidebarIconButtonProps) {
  return (
    <Button
      variant="bare"
      aria-label={label}
      aria-pressed={isToggledOn}
      isDisabled={isDisabled}
      onPress={onPress}
      className={css({
        '&:hover': {
          backgroundColor: theme.sidebarControlBackground,
          color: theme.sidebarItemTextSelected,
        },
      })}
      style={{
        width: 18,
        height: 18,
        padding: 0,
        borderRadius: radius.sm,
        color: isToggledOn
          ? theme.sidebarItemTextSelected
          : theme.sidebarTextSubdued,
        backgroundColor: isToggledOn
          ? theme.sidebarControlBackground
          : 'transparent',
      }}
    >
      <Icon width={12} height={12} style={{ flexShrink: 0 }} />
    </Button>
  );
}
