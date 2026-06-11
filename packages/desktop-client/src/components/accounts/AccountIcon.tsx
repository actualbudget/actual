import type { AccountEntity } from '@actual-app/core/types/models';

type AccountIconProps = {
  account: AccountEntity | undefined;
  size?: number;
};

export function AccountIcon({ account, size = 20 }: AccountIconProps) {
  const icon = account?.icon ?? account?.bank?.icon ?? null;
  if (!account || !icon) return null;
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
      }}
    />
  );
}
