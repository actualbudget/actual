import React, { Fragment, useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation, useParams, useSearchParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { SvgDotsHorizontalTriple } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { TextOneLine } from '@actual-app/components/text-one-line';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { MobileBackButton } from '#components/mobile/MobileBackButton';
import { AddTransactionButton } from '#components/mobile/transactions/AddTransactionButton';
import { MobilePageHeader, Page } from '#components/Page';
import { useCategory } from '#hooks/useCategory';
import { useLocale } from '#hooks/useLocale';
import { useNavigate } from '#hooks/useNavigate';
import { SheetNameProvider } from '#hooks/useSheetName';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { CategorySummary } from './CategorySummary';
import { CategoryTransactions } from './CategoryTransactions';
import { UncategorizedTransactions } from './UncategorizedTransactions';

export function CategoryPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const dispatch = useDispatch();
  const [_numberFormat] = useSyncedPref('numberFormat');
  const numberFormat = _numberFormat || 'comma-dot';
  const [hideFraction] = useSyncedPref('hideFraction');
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const isTracking = budgetType === 'tracking';

  const { id: categoryIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const month = searchParams.get('month') || monthUtils.currentMonth();
  const { data: category, isSuccess: isCategoryLoaded } =
    useCategory(categoryIdParam);
  const navigate = useNavigate();
  const location = useLocation();
  const canGoBack = location.key !== 'default';
  const isMissingCategory =
    categoryIdParam !== 'uncategorized' && isCategoryLoaded && !category;
  const canEditBudget = category != null && (isTracking || !category.is_income);

  useEffect(() => {
    if (isMissingCategory) {
      if (canGoBack) {
        void navigate(-1);
      } else {
        void navigate('/budget', { replace: true });
      }
    }
  }, [isMissingCategory, canGoBack, navigate]);

  const onOpenActions = () => {
    if (!category) {
      return;
    }
    dispatch(
      pushModal({
        modal: {
          name: 'category-actions',
          options: { categoryId: category.id, month },
        },
      }),
    );
  };

  const onEditBudget = () => {
    if (!canEditBudget) {
      return;
    }
    dispatch(
      pushModal({
        modal: {
          name: 'budget-amount',
          options: { categoryId: category.id, month },
        },
      }),
    );
  };

  const onEditAutomations = () => {
    if (!category) {
      return;
    }
    dispatch(
      pushModal({
        modal: {
          name: 'category-automations-edit',
          options: { categoryId: category.id, month },
        },
      }),
    );
  };

  return (
    <Page
      header={
        <MobilePageHeader
          title={
            category ? (
              <View>
                <TextOneLine>{category.name}</TextOneLine>
                <TextOneLine
                  style={{
                    ...styles.verySmallText,
                    fontWeight: 400,
                    color: theme.mobileHeaderTextSubdued,
                  }}
                >
                  {monthUtils.format(month, "MMMM ''yy", locale)}
                </TextOneLine>
              </View>
            ) : (
              <TextOneLine>
                <Trans>Uncategorized</Trans>
              </TextOneLine>
            )
          }
          leftContent={<MobileBackButton />}
          rightContent={
            category ? (
              <Button
                variant="bare"
                style={{ margin: 10 }}
                onPress={onOpenActions}
                aria-label={t('Category menu')}
              >
                <SvgDotsHorizontalTriple width={17} height={17} />
              </Button>
            ) : (
              <AddTransactionButton />
            )
          }
        />
      }
      padding={0}
    >
      {/* This key forces the whole table rerender when the number format changes */}
      <Fragment key={numberFormat + hideFraction}>
        {category ? (
          <>
            <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
              <CategorySummary
                category={category}
                month={month}
                onEditBudget={onEditBudget}
                onEditAutomations={onEditAutomations}
              />
            </SheetNameProvider>
            <CategoryTransactions category={category} month={month} />
          </>
        ) : (
          <UncategorizedTransactions />
        )}
      </Fragment>
    </Page>
  );
}
