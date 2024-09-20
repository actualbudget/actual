import React from 'react';
import { useListBoxSection } from 'react-aria';

import { css } from '@emotion/css';

import { styles, theme } from '../../../style';

import { Option } from './Option';

const zIndices = { SECTION_HEADING: 10 };

export function ListBoxSection({ section, state }) {
  const { itemProps, headingProps, groupProps } = useListBoxSection({
    heading: section.rendered,
    'aria-label': section['aria-label'],
  });

  // The heading is rendered inside an <li> element, which contains
  // a <ul> with the child items.
  return (
    <li {...itemProps} style={{ width: '100%' }}>
      {section.rendered && (
        <div
          {...headingProps}
          className={css([
            styles.smallText,
            {
              backgroundColor: theme.pageBackground,
              borderBottom: `1px solid ${theme.tableBorder}`,
              borderTop: `1px solid ${theme.tableBorder}`,
              color: theme.tableHeaderText,
              display: 'flex',
              justifyContent: 'center',
              paddingBottom: 4,
              paddingTop: 4,
              position: 'sticky',
              top: '0',
              width: '100%',
              zIndex: zIndices.SECTION_HEADING,
            },
          ])}
        >
          {section.rendered}
        </div>
      )}
      <ul
        {...groupProps}
        style={{
          padding: 0,
          listStyle: 'none',
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
  );
}
