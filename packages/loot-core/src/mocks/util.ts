// @ts-strict-ignore
import { stripVTControlCharacters } from 'node:util';
import { basename, dirname, join } from 'path';

import { diff } from 'jest-diff';

export function expectSnapshotWithDiffer(
  initialValue,
  { onlyUpdates }: { onlyUpdates? } = {},
) {
  let currentValue = initialValue;
  if (!onlyUpdates) {
    expect(initialValue).toMatchSnapshot();
  }
  return {
    expectToMatchDiff: value => {
      expect(
        stripVTControlCharacters(
          diff(currentValue, value, {
            aAnnotation: 'First value',
            bAnnotation: 'Second value',
            contextLines: 5,
            expand: false,
          }),
        ),
      ).toMatchSnapshot();
      currentValue = value;
    },
  };
}

export function getFixtures(filename) {
  join(
    dirname(filename),
    '__fixtures__',
    basename(filename).replace(/\.[^.]+.js/, '.fixtures.js'),
  );
}

export function debugDOM(node) {
  function debugDOM(node, indent = 0) {
    let str = '';
    if (node) {
      str += ' '.repeat(indent);
      if (node.tagName) {
        str +=
          node.tagName.toLowerCase() +
          ' ' +
          (node.tabIndex || '') +
          (node.dataset['testid'] ? ' ' + node.dataset['testid'] : '') +
          '\n';
      } else {
        str += node.textContent + '\n';
      }

      for (const child of node.childNodes) {
        str += debugDOM(child, indent + 2);
      }
    }
    return str;
  }

  return debugDOM(node);
}
