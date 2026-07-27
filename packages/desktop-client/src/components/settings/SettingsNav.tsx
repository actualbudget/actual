import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { Link } from '#components/common/Link';
import { useIsUsingSyncServer } from '#hooks/useIsUsingSyncServer';

const tabStyle = {
  ...styles.mediumText,
  display: 'inline-flex',
  padding: '8px 12px',
  borderRadius: 6,
  color: theme.pageTextSubdued,
  textDecoration: 'none',
  border: '2px solid transparent',
};

const activeTabStyle = {
  color: theme.pageText,
  backgroundColor: theme.sidebarItemBackgroundHover,
  fontWeight: 600,
};

export function SettingsNav() {
  const { t } = useTranslation();
  const isUsingSyncServer = useIsUsingSyncServer();

  const tabs: Array<{ to: string; label: string; exact?: boolean }> = [
    { to: '/settings', label: t('General'), exact: true },
    { to: '/settings/payees', label: t('Payees') },
    { to: '/settings/rules', label: t('Rules') },
    ...(isUsingSyncServer
      ? [{ to: '/settings/bank-sync', label: t('Bank Sync') }]
      : []),
    { to: '/settings/tags', label: t('Tags') },
  ];

  return (
    <View
      aria-label={t('Settings sections')}
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginLeft: 20,
        marginBottom: 16,
        paddingBottom: 8,
        borderBottom: `1px solid ${theme.tableBorder}`,
      }}
    >
      {tabs.map(tab => (
        <Link
          key={tab.to}
          variant="internal"
          to={tab.to}
          isExactPathMatch={tab.exact}
          style={tabStyle}
          activeStyle={activeTabStyle}
        >
          {tab.label}
        </Link>
      ))}
    </View>
  );
}
