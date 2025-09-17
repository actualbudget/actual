// @ts-strict-ignore
import fs from 'fs/promises';
import { join, dirname, basename } from 'path';

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
        diff(currentValue, value, {
          aAnnotation: 'First value',
          bAnnotation: 'Second value',
          contextLines: 5,
          expand: false,
        }),
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

export function patchFetchForSqlJS(baseURL: string) {
  // Patch the global fetch to resolve to a file
  // This is a workaround for the fact that initSqlJS uses fetch to load the wasm file
  // and we can't use the file protocol directly in tests
  vi.spyOn(global, 'fetch').mockImplementation(
    async (url: string | URL | Request) => {
      if (typeof url === 'string' && url.startsWith(baseURL)) {
        return new Response(new Uint8Array(await fs.readFile(url)), {
          status: 200,
          statusText: 'OK',
          headers: {
            'Content-Type': 'application/wasm',
          },
        });
      }
      return Promise.reject(new Error(`fetch not mocked for ${url}`));
    },
  );
}
