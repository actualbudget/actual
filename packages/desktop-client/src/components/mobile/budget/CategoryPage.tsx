import React, { Fragment } from 'react';
import { Trans } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router';

import { TextOneLine } from '@actual-app/components/text-one-line';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { MobileBackButton } from '#components/mobile/MobileBackButton';
import { AddTransactionButton } from '#components/mobile/transactions/AddTransactionButton';
import { MobilePageHeader, Page } from '#components/Page';
import { useCategory } from '#hooks/useCategory';
import { useLocale } from '#hooks/useLocale';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { CategoryTransactions } from './CategoryTransactions';
import { UncategorizedTransactions } from './UncategorizedTransactions';

export function CategoryPage() {
  const locale = useLocale();
  const [_numberFormat] = useSyncedPref('numberFormat');
  const numberFormat = _numberFormat || 'comma-dot';
  const [hideFraction] = useSyncedPref('hideFraction');

  const { id: categoryIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const month = searchParams.get('month') || monthUtils.currentMonth();
  const { data: category } = useCategory(categoryIdParam);

  return (
    <Page
      header={
        <MobilePageHeader
          title={
            category ? (
              <View>
                <TextOneLine>{category.name}</TextOneLine>
                <TextOneLine>
                  ({monthUtils.format(month, "MMMM ''yy", locale)})
                </TextOneLine>
              </View>
            ) : (
              <TextOneLine>
                <Trans>Uncategorized</Trans>
              </TextOneLine>
            )
          }
          leftContent={<MobileBackButton />}
          rightContent={<AddTransactionButton categoryId={category?.id} />}
        />
      }
      padding={0}
    >
      {/* This key forces the whole table rerender when the number format changes */}
      <Fragment key={numberFormat + hideFraction}>
        {category ? (
          <CategoryTransactions category={category} month={month} />
        ) : (
          <UncategorizedTransactions />
        )}
      </Fragment>
    </Page>
  );
}
