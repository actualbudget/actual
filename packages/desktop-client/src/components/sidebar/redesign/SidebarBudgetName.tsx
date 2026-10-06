import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgTime } from '@actual-app/components/icons/v1';
import { SvgPencil1 } from '@actual-app/components/icons/v2';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { isElectron } from '@actual-app/core/shared/environment';
import { css, cx } from '@emotion/css';

import { useMetadataPref } from '#hooks/useMetadataPref';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

export function SidebarBudgetName() {
  const { t } = useTranslation();
  const [budgetName, setBudgetNamePref] = useMetadataPref('budgetName');
  const [isEditing, setIsEditing] = useState(false);
  const dispatch = useDispatch();

  const iconButtonClassName = cx(
    'hover-visible',
    css({
      backgroundColor: 'transparent',
      '&[data-hovered], &[data-focus-visible]': {
        backgroundColor: theme.sidebarControlBackground,
      },
    }),
  );

  if (isEditing) {
    return (
      <InitialFocus>
        <Input
          aria-label={t('Budget name')}
          size="medium"
          style={{
            fontWeight: 600,
            paddingBlock: 0,
            paddingInline: spacing.xs,
            marginBlock: -1,
          }}
          defaultValue={budgetName}
          onEnter={newBudgetName => {
            if (newBudgetName.trim() !== '') {
              setBudgetNamePref(newBudgetName);
            }
            setIsEditing(false);
          }}
          onEscape={() => setIsEditing(false)}
          onBlur={() => setIsEditing(false)}
        />
      </InitialFocus>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        minWidth: 0,
        '& .hover-visible': {
          opacity: 0,
        },
        '&:hover .hover-visible, & .hover-visible[data-focus-visible]': {
          opacity: 1,
        },
      }}
    >
      <Text
        data-testid="budget-name"
        style={{
          color: theme.sidebarHeaderText,
          fontSize: 13,
          fontWeight: 600,
          ...styles.ellipsisText,
        }}
      >
        {budgetName || t('Unnamed')}
      </Text>
      <Button
        variant="bare"
        className={iconButtonClassName}
        aria-label={t('Rename budget')}
        style={{ padding: spacing.xxs, flexShrink: 0 }}
        onPress={() => setIsEditing(true)}
      >
        <SvgPencil1
          width={11}
          height={11}
          style={{ color: theme.sidebarTextSubdued }}
        />
      </Button>
      {isElectron() && (
        <Tooltip
          content={t('Load Backup…')}
          placement="bottom start"
          style={styles.tooltip}
          triggerProps={{ delay: 500 }}
        >
          <Button
            variant="bare"
            className={iconButtonClassName}
            aria-label={t('Load Backup…')}
            style={{ padding: spacing.xxs, flexShrink: 0 }}
            onPress={() =>
              dispatch(
                pushModal({ modal: { name: 'load-backup', options: {} } }),
              )
            }
          >
            <SvgTime
              width={11}
              height={11}
              style={{ color: theme.sidebarTextSubdued }}
            />
          </Button>
        </Tooltip>
      )}
    </View>
  );
}
