import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgRemove } from '@actual-app/components/icons/v2';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { useTagColors, useTagCSS } from '#hooks/useTagCSS';

type DesktopTaggedNotesProps = {
  content: string;
  onPress?: (content: string) => void;
  /** When provided, hovering the tag reveals a button that calls this. */
  onRemove?: () => void;
  tag: string;
  separator: string;
};

const REMOVE_BADGE_SIZE = 14;
const REMOVE_ICON_SIZE = 8;

export function DesktopTaggedNotes({
  content,
  onPress,
  onRemove,
  tag,
  separator,
}: DesktopTaggedNotesProps) {
  const { t } = useTranslation();
  const getTagCSS = useTagCSS();
  const getTagColors = useTagColors();

  const tagButton = (
    <Button
      variant="bare"
      className={getTagCSS(tag)}
      onPress={() => {
        onPress?.(content);
      }}
    >
      {content}
    </Button>
  );

  if (!onRemove) {
    return (
      <View style={{ display: 'inline' }}>
        {tagButton}
        {separator}
      </View>
    );
  }

  const { color, backgroundColor, backgroundColorHovered, isHidden } =
    getTagColors(tag);

  // The wrapper only exists to anchor the remove badge: it takes exactly the
  // tag button's box, so the pill renders the same as without it.
  const wrapperClassName = css({
    position: 'relative',
    display: 'inline-flex',
    '& > [data-tag-remove]': { display: 'none' },
    // Separate rules: a browser that can't parse `:has()` would otherwise drop
    // the whole selector list, hover included.
    '&:hover > [data-tag-remove]': { display: 'flex' },
    '&:has(:focus-visible) > [data-tag-remove]': { display: 'flex' },
    // Keep the pill highlighted while the pointer is over the badge, which
    // overlays the tag button and so takes its hover state away.
    '&:hover > :first-child': { backgroundColor: backgroundColorHovered },
  });

  // The badge is out of flow so revealing it never shifts the notes text. It
  // uses the pill's colours inverted to stay legible on top of the tag. It
  // sits inside the pill's corner rather than overhanging it because the
  // notes cell clips its text to exactly the pill's box.
  const badgeBackground = `${color} !important`;
  const removeClassName = css({
    position: 'absolute',
    top: 0,
    right: 0,
    width: REMOVE_BADGE_SIZE,
    height: REMOVE_BADGE_SIZE,
    padding: 0,
    borderRadius: '50%',
    // Outlined in the icon's colour so the badge still reads as a circle where
    // it overlaps tag text, which is the same colour as its fill. Drawn inside
    // the badge's box so the outline doesn't change its size.
    boxSizing: 'border-box',
    border: `1px solid ${backgroundColor}`,
    opacity: isHidden ? 0.5 : undefined,
    // !important overrides the bare button's own state colours.
    backgroundColor: badgeBackground,
    color: `${backgroundColor} !important`,
    cursor: 'pointer',
    '&[data-hovered], &[data-pressed], &[data-focus-visible]': {
      backgroundColor: `color-mix(in srgb, ${color} 70%, ${backgroundColor}) !important`,
    },
  });

  return (
    <View style={{ display: 'inline' }}>
      <span className={wrapperClassName}>
        {tagButton}
        <Button
          variant="bare"
          data-tag-remove
          className={removeClassName}
          aria-label={t('Remove tag {{tag}}', { tag: content })}
          onPress={onRemove}
        >
          <SvgRemove width={REMOVE_ICON_SIZE} height={REMOVE_ICON_SIZE} />
        </Button>
      </span>
      {separator}
    </View>
  );
}
