import type { AccountEntity } from '@actual-app/core/types/models';

export function AccountHeaderIcon({ account }: { account: AccountEntity }) {
  const icon = account.displayIcon;
  if (!icon) return null;
  return (
    <img
      src={icon}
      alt=""
      width={20}
      height={20}
      style={{
        margin: 'auto',
        marginRight: 6,
        objectFit: 'contain',
        flexShrink: 0,
        borderRadius: 4,
      }}
    />
  );
}
