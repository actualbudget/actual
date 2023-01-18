import React, { useEffect } from 'react';

import { useFocusRing } from '@react-aria/focus';
import { useListBox, useListBoxSection, useOption } from '@react-aria/listbox';
import { mergeProps } from '@react-aria/utils';
import { Item, Section } from '@react-stately/collections';
import { useListState } from '@react-stately/list';
import memoizeOne from 'memoize-one';

import * as monthUtils from 'loot-core/src/shared/months';
import { getScheduledAmount } from 'loot-core/src/shared/schedules';
import { titleFirst } from 'loot-core/src/shared/util';
import { integerToCurrency, groupById } from 'loot-core/src/shared/util';
import { Text, TextOneLine, View } from 'loot-design/src/components/common';
import { styles, colors } from 'loot-design/src/style';
import ArrowsSynchronize from 'loot-design/src/svg/v2/ArrowsSynchronize';
import CheckCircle1 from 'loot-design/src/svg/v2/CheckCircle1';

const zIndices = { SECTION_HEADING: 10 };

let getPayeesById = memoizeOne(payees => groupById(payees));
let getAccountsById = memoizeOne(accounts => groupById(accounts));

export function isPreviewId(id) {
  return id.indexOf('preview/') !== -1;
}

function getDescriptionPretty(transaction, payee, transferAcct) {
  let { amount } = transaction;

  if (transferAcct) {
    return `Transfer ${amount > 0 ? 'from' : 'to'} ${transferAcct.name}`;
  } else if (payee) {
    return payee.name;
  }

  return '';
}

function lookupName(items, id) {
  return items.find(item => item.id === id).name;
}

export function DateHeader({ date }) {
  return (
    <ListItem
      style={{
        height: 25,
        backgroundColor: colors.n10,
        borderColor: colors.n9,
        justifyContent: 'center'
      }}
    >
      <Text style={[styles.text, { fontSize: 13, color: colors.n4 }]}>
        {monthUtils.format(date, 'MMMM dd, yyyy')}
      </Text>
    </ListItem>
  );
}

function Status({ status }) {
  let color;

  switch (status) {
    case 'missed':
      color = colors.r3;
      break;
    case 'due':
      color = colors.y3;
      break;
    case 'upcoming':
      color = colors.n4;
      break;
    default:
  }

  return (
    <Text
      style={{
        fontSize: 11,
        color,
        fontStyle: 'italic'
      }}
    >
      {titleFirst(status)}
    </Text>
  );
}

export class Transaction extends React.PureComponent {
  render() {
    const {
      transaction,
      accounts,
      categories,
      payees,
      showCategory,
      added,
      // onSelect,
      style
    } = this.props;
    let {
      id,
      payee: payeeId,
      amount,
      category,
      cleared,
      is_parent,
      notes,
      schedule
    } = transaction;

    if (isPreviewId(id)) {
      amount = getScheduledAmount(amount);
    }

    let categoryName = category ? lookupName(categories, category) : null;

    let payee = payees && payeeId && getPayeesById(payees)[payeeId];
    let transferAcct =
      payee &&
      payee.transfer_acct &&
      getAccountsById(accounts)[payee.transfer_acct];

    let prettyDescription = getDescriptionPretty(
      transaction,
      payee,
      transferAcct
    );
    let prettyCategory = transferAcct
      ? 'Transfer'
      : is_parent
      ? 'Split'
      : categoryName;

    let isPreview = isPreviewId(id);
    let textStyle = isPreview && {
      fontStyle: 'italic',
      color: colors.n5
    };

    return (
      // <Button
      //   onClick={() => onSelect(transaction)}
      //   style={{
      //     backgroundColor: 'white',
      //     border: 'none',
      //     width: '100%',
      //     '&:active': { opacity: 0.1 }
      //   }}
      // >
      <ListItem
        style={[
          { flex: 1, height: 60, padding: '5px 10px' }, // remove padding when Button is back
          isPreview && { backgroundColor: colors.n11 },
          style
        ]}
      >
        <View style={[{ flex: 1 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {schedule && (
              <ArrowsSynchronize
                style={{
                  width: 12,
                  height: 12,
                  marginRight: 5,
                  color: textStyle.color || colors.n1
                }}
              />
            )}
            <TextOneLine
              style={[
                styles.text,
                textStyle,
                { fontSize: 14, fontWeight: added ? '600' : '400' },
                prettyDescription === '' && {
                  color: colors.n6,
                  fontStyle: 'italic'
                }
              ]}
            >
              {prettyDescription || 'Empty'}
            </TextOneLine>
          </View>
          {isPreview ? (
            <Status status={notes} />
          ) : (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 3
              }}
            >
              <CheckCircle1
                style={{
                  width: 11,
                  height: 11,
                  color: cleared ? colors.g6 : colors.n8,
                  marginRight: 5
                }}
              />
              {showCategory && (
                <TextOneLine
                  style={{
                    fontSize: 11,
                    marginTop: 1,
                    fontWeight: '400',
                    color: prettyCategory ? colors.n3 : colors.p7,
                    fontStyle: prettyCategory ? null : 'italic',
                    textAlign: 'left'
                  }}
                >
                  {prettyCategory || 'Uncategorized'}
                </TextOneLine>
              )}
            </View>
          )}
        </View>
        <Text
          style={[
            styles.text,
            textStyle,
            { marginLeft: 25, marginRight: 5, fontSize: 14 }
          ]}
        >
          {integerToCurrency(amount)}
        </Text>
      </ListItem>
      // </Button>
    );
  }
}

export class TransactionList extends React.Component {
  makeData = memoizeOne(transactions => {
    // Group by date. We can assume transactions is ordered
    const sections = [];
    transactions.forEach(transaction => {
      if (
        sections.length === 0 ||
        transaction.date !== sections[sections.length - 1].date
      ) {
        // Mark the last transaction in the section so it can render
        // with a different border
        let lastSection = sections[sections.length - 1];
        if (lastSection && lastSection.data.length > 0) {
          let lastData = lastSection.data;
          lastData[lastData.length - 1].isLast = true;
        }

        sections.push({
          id: transaction.date,
          date: transaction.date,
          data: []
        });
      }

      if (!transaction.is_child) {
        sections[sections.length - 1].data.push(transaction);
      }
    });
    return sections;
  });

  render() {
    const {
      transactions,
      scrollProps = {},
      onLoadMore
      // refreshControl
    } = this.props;

    const sections = this.makeData(transactions);

    return (
      <>
        {scrollProps.ListHeaderComponent}
        <ListBox
          {...scrollProps}
          aria-label="transaction list"
          label=""
          loadMore={onLoadMore}
          selectionMode="none"
          style={{ flex: '1 auto', height: '100%', overflowY: 'auto' }}
        >
          {sections.length === 0 ? (
            <Section>
              <Item>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    width: '100%'
                  }}
                >
                  <Text style={{ fontSize: 15 }}>No transactions</Text>
                </div>
              </Item>
            </Section>
          ) : null}
          {sections.map(section => {
            return (
              <Section
                title={monthUtils.format(section.date, 'MMMM dd, yyyy')}
                key={section.id}
              >
                {section.data.map((transaction, index, transactions) => {
                  return (
                    <Item
                      key={transaction.id}
                      style={{
                        fontSize:
                          index === transactions.length - 1 ? 98 : 'inherit'
                      }}
                      textValue={transaction.id}
                    >
                      <Transaction
                        transaction={transaction}
                        categories={this.props.categories}
                        accounts={this.props.accounts}
                        payees={this.props.payees}
                        showCategory={this.props.showCategory}
                        added={this.props.isNew(transaction.id)}
                        onSelect={() => {}} // onSelect(transaction)}
                      />
                    </Item>
                  );
                })}
              </Section>
            );
          })}
        </ListBox>
      </>
    );
  }
}

function ListBox(props) {
  let state = useListState(props);
  let listBoxRef = React.useRef();
  let { listBoxProps, labelProps } = useListBox(props, state, listBoxRef);

  useEffect(() => {
    function loadMoreTransactions() {
      if (
        Math.abs(
          listBoxRef.current.scrollHeight -
            listBoxRef.current.clientHeight -
            listBoxRef.current.scrollTop
        ) < listBoxRef.current.clientHeight // load more when we're one screen height from the end
      ) {
        props.loadMore();
      }
    }

    listBoxRef.current.addEventListener('scroll', loadMoreTransactions);

    return () => {
      listBoxRef.current &&
        listBoxRef.current.removeEventListener('scroll', loadMoreTransactions);
    };
  }, [state.collection]);

  return (
    <>
      <div {...labelProps}>{props.label}</div>
      <ul
        {...listBoxProps}
        ref={listBoxRef}
        style={{
          padding: 0,
          listStyle: 'none',
          margin: 0,
          overflowY: 'auto',
          width: '100%'
        }}
      >
        {[...state.collection].map(item => (
          <ListBoxSection key={item.key} section={item} state={state} />
        ))}
      </ul>
    </>
  );
}

function ListBoxSection({ section, state }) {
  let { itemProps, headingProps, groupProps } = useListBoxSection({
    heading: section.rendered,
    'aria-label': section['aria-label']
  });

  // The heading is rendered inside an <li> element, which contains
  // a <ul> with the child items.
  return (
    <>
      <li {...itemProps} style={{ width: '100%' }}>
        {section.rendered && (
          <div
            {...headingProps}
            style={{
              ...styles.smallText,
              backgroundColor: colors.n10,
              borderBottom: `1px solid ${colors.n9}`,
              borderTop: `1px solid ${colors.n9}`,
              color: colors.n4,
              display: 'flex',
              justifyContent: 'center',
              paddingBottom: 4,
              paddingTop: 4,
              position: 'sticky',
              top: '0',
              width: '100%',
              zIndex: zIndices.SECTION_HEADING
            }}
          >
            {section.rendered}
          </div>
        )}
        <ul
          {...groupProps}
          style={{
            padding: 0,
            listStyle: 'none'
          }}
        >
          {[...section.childNodes].map((node, index, nodes) => (
            <Option
              key={node.key}
              item={node}
              state={state}
              isLast={index === nodes.length - 1}
            />
          ))}
        </ul>
      </li>
    </>
  );
}

function Option({ isLast, item, state }) {
  // Get props for the option element
  let ref = React.useRef();
  let { optionProps, isSelected } = useOption({ key: item.key }, state, ref);

  // Determine whether we should show a keyboard
  // focus ring for accessibility
  let { isFocusVisible, focusProps } = useFocusRing();

  return (
    <li
      {...mergeProps(optionProps, focusProps)}
      ref={ref}
      style={{
        background: isSelected ? 'blueviolet' : 'transparent',
        color: isSelected ? 'white' : null,
        outline: isFocusVisible ? '2px solid orange' : 'none',
        ...(!isLast && { borderBottom: `1px solid ${colors.border}` })
      }}
    >
      {item.rendered}
    </li>
  );
}

export const ROW_HEIGHT = 50;

export const ListItem = React.forwardRef(
  ({ children, style, ...props }, ref) => {
    return (
      <View
        style={[
          {
            height: ROW_HEIGHT,
            flexDirection: 'row',
            alignItems: 'center',
            paddingLeft: 10,
            paddingRight: 10
          },
          style
        ]}
        ref={ref}
        {...props}
      >
        {children}
      </View>
    );
  }
);
