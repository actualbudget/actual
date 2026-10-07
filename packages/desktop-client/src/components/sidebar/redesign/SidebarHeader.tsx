import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgLogo } from '@actual-app/components/icons/logo';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { closeBudget } from '#budgetfiles/budgetfilesSlice';
import { hasMacOSWindowButtons } from '#components/sidebar/SidebarShell';
import { useDispatch } from '#redux';

import { SidebarBudgetName } from './SidebarBudgetName';
import { SyncStatusLine } from './SyncStatusLine';

const MAC_WINDOW_BUTTONS_INSET = spacing.xl + spacing.md;

type SidebarHeaderProps = {
  children?: ReactNode;
};

export function SidebarHeader({ children }: SidebarHeaderProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [isEditingName, setIsEditingName] = useState(false);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: `${spacing.md}px ${spacing.md}px ${spacing.sm}px`,
        paddingTop: hasMacOSWindowButtons()
          ? MAC_WINDOW_BUTTONS_INSET
          : spacing.md,
        borderBottom: `1px solid ${theme.sidebarBorder}`,
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <Tooltip
        content={t('Switch file')}
        placement="bottom start"
        style={styles.tooltip}
        triggerProps={{ delay: 500 }}
      >
        <Button
          variant="bare"
          aria-label={t('Switch file')}
          className={css({
            backgroundColor: 'transparent',
            '&[data-hovered], &[data-focus-visible]': {
              backgroundColor: theme.sidebarControlBackground,
            },
          })}
          style={{
            padding: spacing.xs,
            margin: -spacing.xs,
            flexShrink: 0,
          }}
          onPress={() => void dispatch(closeBudget())}
        >
          <SvgLogo
            width={28}
            height={28}
            style={{ color: theme.sidebarBrand }}
          />
        </Button>
      </Tooltip>
      <View style={{ position: 'relative', minWidth: 0, flex: 1 }}>
        <SidebarBudgetName
          isEditing={isEditingName}
          onEditingChange={setIsEditingName}
        />
        <View style={{ visibility: isEditingName ? 'hidden' : undefined }}>
          <SyncStatusLine />
        </View>
      </View>
      {!isEditingName && children}
    </View>
  );
}
