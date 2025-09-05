// @ts-strict-ignore
import React, {
  Fragment,
  type ComponentProps,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type CSSProperties,
  useRef,
} from 'react';
import { useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { TextOneLine } from '@actual-app/components/text-one-line';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

import { type AccountEntity } from 'loot-core/types/models';

import { Autocomplete } from './Autocomplete';
import { ItemHeader } from './ItemHeader';

import { useAccounts } from '@desktop-client/hooks/useAccounts';

type AccountAutocompleteItem = AccountEntity;

type AccountListProps = {
  items: AccountAutocompleteItem[];
  getItemProps: (arg: {
    item: AccountAutocompleteItem;
  }) => ComponentProps<typeof View>;
  highlightedIndex: number;
  embedded: boolean;
  renderAccountItemGroupHeader?: (
    props: ComponentPropsWithoutRef<typeof ItemHeader>,
  ) => ReactElement<typeof ItemHeader>;
  renderAccountItem?: (
    props: ComponentPropsWithoutRef<typeof AccountItem>,
  ) => ReactElement<typeof AccountItem>;
};

function AccountList({
  items,
  getItemProps,
  highlightedIndex,
  embedded,
  renderAccountItemGroupHeader = defaultRenderAccountItemGroupHeader,
  renderAccountItem = defaultRenderAccountItem,
}: AccountListProps) {
  const { t } = useTranslation();
  const lastItem = useRef<AccountAutocompleteItem | null>(null);

  return (
    <View>
      <View
        style={{
          overflow: 'auto',
          padding: '5px 0',
          ...(!embedded && { maxHeight: 175 }),
        }}
      >
        {items.map((item, idx) => {
          const showGroup = lastItem.current
            ? (item.offbudget !== lastItem.current.offbudget && !item.closed) ||
              (item.closed !== lastItem.current.closed && !item.offbudget)
            : true;

          const group = `${
            item.closed
              ? t('Closed Accounts')
              : item.offbudget
                ? t('Off budget')
                : t('On budget')
          }`;

          lastItem.current = item;

          return [
            showGroup ? (
              <Fragment key={group}>
                {renderAccountItemGroupHeader({ title: group })}
              </Fragment>
            ) : null,
            <Fragment key={item.id}>
              {renderAccountItem({
                ...(getItemProps ? getItemProps({ item }) : null),
                item,
                highlighted: highlightedIndex === idx,
                embedded,
              })}
            </Fragment>,
          ];
        })}
      </View>
    </View>
  );
}

type AccountAutocompleteProps = ComponentProps<
  typeof Autocomplete<AccountAutocompleteItem>
> & {
  embedded?: boolean;
  includeClosedAccounts?: boolean;
  hiddenAccounts?: AccountEntity['id'][];
  renderAccountItemGroupHeader?: (
    props: ComponentPropsWithoutRef<typeof ItemHeader>,
  ) => ReactElement<typeof ItemHeader>;
  renderAccountItem?: (
    props: ComponentPropsWithoutRef<typeof AccountItem>,
  ) => ReactElement<typeof AccountItem>;
  closeOnBlur?: boolean;
};

export function AccountAutocomplete({
  embedded,
  includeClosedAccounts = true,
  renderAccountItemGroupHeader,
  renderAccountItem,
  closeOnBlur,
  hiddenAccounts,
  ...props
}: AccountAutocompleteProps) {
  const accounts = useAccounts() || [];

  //remove closed accounts if needed
  //then sort by closed, then offbudget
  const accountSuggestions: AccountAutocompleteItem[] = accounts
    .filter(item => {
      return (
        (includeClosedAccounts ? item : !item.closed) &&
        !hiddenAccounts?.includes(item.id)
      );
    })
    .sort(
      (a, b) =>
        a.closed - b.closed ||
        a.offbudget - b.offbudget ||
        a.sort_order - b.sort_order,
    );

  return (
    <Autocomplete
      strict={true}
      highlightFirst={true}
      embedded={embedded}
      closeOnBlur={closeOnBlur}
      suggestions={accountSuggestions}
      renderItems={(items, getItemProps, highlightedIndex) => (
        <AccountList
          items={items}
          getItemProps={getItemProps}
          highlightedIndex={highlightedIndex}
          embedded={embedded}
          renderAccountItemGroupHeader={renderAccountItemGroupHeader}
          renderAccountItem={renderAccountItem}
        />
      )}
      {...props}
    />
  );
}

function defaultRenderAccountItemGroupHeader(
  props: ComponentPropsWithoutRef<typeof ItemHeader>,
): ReactElement<typeof ItemHeader> {
  return <ItemHeader {...props} type="account" />;
}

type AccountItemProps = {
  item: AccountAutocompleteItem;
  className?: string;
  style?: CSSProperties;
  highlighted?: boolean;
  embedded?: boolean;
};

function AccountItem({
  item,
  className,
  highlighted,
  embedded,
  ...props
}: AccountItemProps) {
  const { isNarrowWidth } = useResponsive();
  const narrowStyle = isNarrowWidth
    ? {
        ...styles.mobileMenuItem,
        borderRadius: 0,
        borderTop: `1px solid ${theme.pillBorder}`,
      }
    : {};

  return (
    <div
      // List each account up to a max
      // Downshift calls `setTimeout(..., 250)` in the `onMouseMove`
      // event handler they set on this element. When this code runs
      // in WebKit on touch-enabled devices, taps on this element end
      // up not triggering the `onClick` event (and therefore delaying
      // response to user input) until after the `setTimeout` callback
      // finishes executing. This is caused by content observation code
      // that implements various strategies to prevent the user from
      // accidentally clicking content that changed as a result of code
      // run in the `onMouseMove` event.
      //
      // Long story short, we don't want any delay here between the user
      // tapping and the resulting action being performed. It turns out
      // there's some "fast path" logic that can be triggered in various
      // ways to force WebKit to bail on the content observation process.
      // One of those ways is setting `role="button"` (or a number of
      // other aria roles) on the element, which is what we're doing here.
      //
      // ref:
      // * https://github.com/WebKit/WebKit/blob/447d90b0c52b2951a69df78f06bb5e6b10262f4b/LayoutTests/fast/events/touch/ios/content-observation/400ms-hover-intent.html
      // * https://github.com/WebKit/WebKit/blob/58956cf59ba01267644b5e8fe766efa7aa6f0c5c/Source/WebCore/page/ios/ContentChangeObserver.cpp
      // * https://github.com/WebKit/WebKit/blob/58956cf59ba01267644b5e8fe766efa7aa6f0c5c/Source/WebKit/WebProcess/WebPage/ios/WebPageIOS.mm#L783
      role="button"
      className={cx(
        className,
        css({
          backgroundColor: highlighted
            ? theme.menuAutoCompleteBackgroundHover
            : 'transparent',
          color: highlighted
            ? theme.menuAutoCompleteItemTextHover
            : theme.menuAutoCompleteItemText,
          padding: 4,
          paddingLeft: 20,
          borderRadius: embedded ? 4 : 0,
          ...narrowStyle,
        }),
      )}
      data-testid={`${item.name}-account-item`}
      data-highlighted={highlighted || undefined}
      {...props}
    >
      <TextOneLine>{item.name}</TextOneLine>
    </div>
  );
}

function defaultRenderAccountItem(
  props: ComponentPropsWithoutRef<typeof AccountItem>,
): ReactElement<typeof AccountItem> {
  return <AccountItem {...props} />;
}
