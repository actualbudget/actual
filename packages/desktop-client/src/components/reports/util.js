import React, { useState, useEffect, Component } from 'react';
import ReactDOM from 'react-dom';

import * as d from 'date-fns';
import { css, before } from 'glamor';
import { VictoryTooltip } from 'victory';

import { runQuery } from 'loot-core/src/client/query-helpers';
import { useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';
import { integerToCurrency } from 'loot-core/src/shared/util';

import { theme, styles } from '../../style';
import Block from '../common/Block';

export function DateRange({ start, end }) {
  start = d.parseISO(start);
  end = d.parseISO(end);

  let content;
  if (start.getYear() !== end.getYear()) {
    content = (
      <div>
        {d.format(start, 'MMM yyyy')} - {d.format(end, 'MMM yyyy')}
      </div>
    );
  } else if (start.getMonth() !== end.getMonth()) {
    content = (
      <div>
        {d.format(start, 'MMM')} - {d.format(end, 'MMM yyyy')}
      </div>
    );
  } else {
    content = d.format(end, 'MMMM yyyy');
  }

  return <Block style={{ color: theme.pageTextSubdued }}>{content}</Block>;
}

export class Tooltip extends Component {
  static defaultEvents = VictoryTooltip.defaultEvents;

  render() {
    let {
      active,
      x,
      y,
      scale,
      datum,
      portalHost,
      offsetX = 0,
      offsetY,
      position,
      light,
      forceActive,
      style,
    } = this.props;
    const xRange = scale.x.range();
    const xPos = x - xRange[0];

    if (!position) {
      if (datum.labelPosition) {
        position = datum.labelPosition;
      } else {
        position = xPos < 150 ? 'right' : 'left';
      }
    }

    if (!portalHost || (!active && !forceActive)) {
      return null;
    }

    y = offsetY ? offsetY(y) : y;

    return ReactDOM.createPortal(
      <div
        className={`${css(
          {
            position: 'absolute',
            top: 0,
            left: offsetX,
            // prettier-ignore
            transform: position === 'right' ?
              `translate(calc(${x}px + 15px), calc(${y}px ${light ? '' : '- 50%'}))` :
              `translate(calc(${x}px - 100% - 15px), calc(${y}px ${light ? '' : '- 50%'}))`,
            zIndex: 1000,
            pointerEvents: 'none',
            borderRadius: 2,
            boxShadow: light ? 'none' : '0 1px 6px rgba(0, 0, 0, .20)',
            // TODO: Transparent background
            backgroundColor: light ? 'transparent' : theme.alt2MenuBackground,
            color: light ? 'inherit' : theme.alt2MenuItemText,
            padding: 10,
          },
          !light &&
            before({
              position: 'absolute',
              display: 'inline-block',
              borderTop: '7px solid transparent',
              borderBottom: '7px solid transparent',
              [position === 'right' ? 'borderRight' : 'borderLeft']:
                '7px solid ' + theme.alt2MenuBackground,
              [position === 'right' ? 'left' : 'right']: -6,
              top: 'calc(50% - 7px)',
              // eslint-disable-next-line rulesdir/typography
              content: '" "',
            }),
          style,
        )}`}
      >
        {datum.premadeLabel}
      </div>,
      portalHost,
    );
  }
}

export function useReport(sheetName, getData) {
  const spreadsheet = useSpreadsheet();
  const [results, setResults] = useState(null);

  useEffect(() => {
    let cleanup;
    getData(spreadsheet, results => setResults(results)).then(c => {
      cleanup = c;
    });
    return () => {
      cleanup?.();
    };
  }, [getData]);

  return results;
}

export function Change({ amount }) {
  return (
    <Block
      style={{
        ...styles.smallText,
        color: amount < 0 ? theme.errorText : theme.noticeTextLight,
      }}
    >
      {amount >= 0 ? '+' : ''}
      {integerToCurrency(amount)}
    </Block>
  );
}

export function fromDateRepr(date) {
  return date.slice(0, 7);
}

export async function runAll(queries, cb) {
  let data = await Promise.all(
    queries.map(q => {
      return runQuery(q).then(({ data }) => data);
    }),
  );
  cb(data);
}

export function index(data, field, mapper) {
  const result = {};
  data.forEach(item => {
    result[mapper ? mapper(item[field]) : item[field]] = item;
  });
  return result;
}

export function indexCashFlow(data, date, isTransfer) {
  const results = {};
  data.forEach(item => {
    let findExisting = results[item.date]
      ? results[item.date][item.isTransfer]
        ? results[item.date][item.isTransfer]
        : 0
      : 0;
    let result = { [item[isTransfer]]: item.amount + findExisting };
    results[item[date]] = { ...results[item[date]], ...result };
  });
  return results;
}
