const { join, dirname, basename } = require('path');

const snapshotDiff = require('snapshot-diff');

export function expectSnapshotWithDiffer(initialValue, { onlyUpdates } = {}) {
  let currentValue = initialValue;
  if (!onlyUpdates) {
    expect(initialValue).toMatchSnapshot();
  }
  return {
    expectToMatchDiff: value => {
      expect(snapshotDiff(currentValue, value)).toMatchSnapshot();
      currentValue = value;
    }
  };
}

export function getFixtures(filename) {
  join(
    dirname(filename),
    '__fixtures__',
    basename(filename).replace(/\.[^.]+.js/, '.fixtures.js')
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

      for (let child of node.childNodes) {
        str += debugDOM(child, indent + 2);
      }
    }
    return str;
  }

  return debugDOM(node);
}
