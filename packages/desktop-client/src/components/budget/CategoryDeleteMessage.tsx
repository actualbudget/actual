import { Trans } from 'react-i18next';

import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';
import type { TransObjectLiteral } from '@actual-app/core/types/util';

type CategoryDeleteMessageProps = {
  category?: CategoryEntity;
  group?: CategoryGroupEntity;
};

export function CategoryDeleteMessage({
  category,
  group,
}: CategoryDeleteMessageProps) {
  const isIncome = Boolean((category ?? group)?.is_income);

  return (
    <>
      {group ? (
        isIncome ? (
          <Trans>
            Categories in the group{' '}
            <strong>{{ group: group.name } as TransObjectLiteral}</strong> are
            used by existing transactions or it has a positive leftover balance
            currently.
          </Trans>
        ) : (
          <Trans>
            Categories in the group{' '}
            <strong>{{ group: group.name } as TransObjectLiteral}</strong> are
            used by existing transactions.
          </Trans>
        )
      ) : isIncome ? (
        <Trans>
          <strong>{{ category: category?.name } as TransObjectLiteral}</strong>{' '}
          is used by existing transactions or it has a positive leftover balance
          currently.
        </Trans>
      ) : (
        <Trans>
          <strong>{{ category: category?.name } as TransObjectLiteral}</strong>{' '}
          is used by existing transactions.
        </Trans>
      )}{' '}
      <Trans>
        <strong>Are you sure you want to delete it?</strong> If so, you must
        select another category to transfer existing transactions and balance
        to.
      </Trans>
    </>
  );
}
