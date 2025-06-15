import { useTranslation, Trans } from 'react-i18next';

import type { PercentageTemplate } from 'loot-core/types/models/templates';

type PercentageAutomationReadOnlyProps = {
  template: PercentageTemplate;
  categoryNameMap: Record<string, string>;
};

export const PercentageAutomationReadOnly = ({
  template,
  categoryNameMap,
}: PercentageAutomationReadOnlyProps) => {
  const { t } = useTranslation();

  if (template.category === 'total') {
    return template.previous ? (
      <Trans>
        Budget {{ percent: template.percent }}% of total income last month
      </Trans>
    ) : (
      <Trans>
        Budget {{ percent: template.percent }}% of total income this month
      </Trans>
    );
  }

  if (template.category === 'to-budget') {
    return template.previous ? (
      <Trans>
        Budget {{ percent: template.percent }}% of available funds to budget
        last month
      </Trans>
    ) : (
      <Trans>
        Budget {{ percent: template.percent }}% of available funds to budget
        this month
      </Trans>
    );
  }

  // Regular income categories
  return template.previous ? (
    <Trans>
      Budget {{ percent: template.percent }}% of &lsquo;
      {{
        category: categoryNameMap[template.category] ?? t('Unknown category'),
      }}
      &rsquo; last month
    </Trans>
  ) : (
    <Trans>
      Budget {{ percent: template.percent }}% of &lsquo;
      {{
        category: categoryNameMap[template.category] ?? t('Unknown category'),
      }}
      &rsquo; this month
    </Trans>
  );
};
