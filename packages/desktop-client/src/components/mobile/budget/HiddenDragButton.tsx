import { Button } from '@actual-app/components/button';
import { SvgMenu } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { radius, spacing } from '@actual-app/components/tokens';
import { css } from '@emotion/css';

export function HiddenDragButton() {
  return (
    <Button
      slot="drag"
      variant="bare"
      className={css({
        ...styles.visuallyHidden,
        '&[data-focus-visible]': {
          position: 'static',
          width: 'auto',
          height: 'auto',
          margin: 0,
          padding: spacing.xs,
          overflow: 'visible',
          clip: 'auto',
          color: theme.pageTextLight,
          borderRadius: radius.sm,
          outline: `2px solid ${theme.formInputBorderSelected}`,
          outlineOffset: 1,
        },
      })}
    >
      <SvgMenu width={14} height={14} />
    </Button>
  );
}
