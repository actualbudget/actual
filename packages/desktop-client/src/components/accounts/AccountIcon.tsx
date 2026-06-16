import type { CSSProperties } from 'react';

import { Text } from '@actual-app/components/text';
import type { AccountEntity } from '@actual-app/core/types/models';

import { isEmojiIcon } from './icon-picker/normalizeIcon';

type AccountIconProps = {
  account: AccountEntity | undefined;
  size?: number;
  style?: CSSProperties;
};

export function AccountIcon({ account, size = 20, style }: AccountIconProps) {
  const icon = account?.icon ?? account?.bank?.icon ?? null;
  if (!account || !icon) return null;

  // Emoji icons are stored as the raw unicode character and rendered as text,
  // which centers reliably across emoji families. Everything else is a data
  // URL image.
  if (isEmojiIcon(icon)) {
    return (
      <Text
        aria-hidden
        style={{
          width: size,
          height: size,
          marginRight: 6,
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: Math.round(size * 0.9),
          lineHeight: 1,
          ...style,
        }}
      >
        {icon}
      </Text>
    );
  }

  return (
    <img
      src={icon}
      alt=""
      width={size}
      height={size}
      style={{
        marginRight: 6,
        objectFit: 'contain',
        flexShrink: 0,
        borderRadius: 4,
        ...style,
      }}
    />
  );
}
