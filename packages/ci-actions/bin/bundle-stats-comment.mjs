#!/usr/bin/env node

/**
 * Generates a combined bundle stats comment for GitHub Actions.
 * Heavily inspired by https://github.com/twk3/rollup-size-compare-action (MIT).
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const REQUIRED_ARGS = new Map([
  ['web-base', 'Path to base web stats JSON'],
  ['web-head', 'Path to head web stats JSON'],
  ['loot-base', 'Path to base loot-core stats JSON'],
  ['loot-head', 'Path to head loot-core stats JSON'],
  ['api-base', 'Path to base API stats JSON'],
  ['api-head', 'Path to head API stats JSON'],
]);

function parseArgs(argv) {
  const args = new Map();

  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];

    if (!key?.startsWith('--')) {
      throw new Error(
        `Unexpected argument "${key ?? ''}". Use --key value pairs.`,
      );
    }

    if (typeof value === 'undefined') {
      throw new Error(`Missing value for argument "${key}".`);
    }

    args.set(key.slice(2), value);
  }

  for (const [key, description] of REQUIRED_ARGS.entries()) {
    if (!args.has(key)) {
      throw new Error(`Missing required argument "--${key}" (${description}).`);
    }
  }

  return {
    webBase: args.get('web-base'),
    webHead: args.get('web-head'),
    lootBase: args.get('loot-base'),
    lootHead: args.get('loot-head'),
    apiBase: args.get('api-base'),
    apiHead: args.get('api-head'),
    identifier: args.get('identifier') ?? 'bundle-stats',
  };
}

async function loadStats(filePath) {
  try {
    const absolutePath = path.resolve(process.cwd(), filePath);
    const fileContents = await readFile(absolutePath, 'utf8');
    return JSON.parse(fileContents);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error while parsing stats file';
    console.warn(`[bundle-stats] Failed to parse "${filePath}": ${message}`);
    return {};
  }
}

function findAllChildren(node = {}) {
  if (Array.isArray(node.children)) {
    return node.children.flatMap(findAllChildren);
  }
  return [node];
}

function trimPath(input) {
  if (!input) {
    return '';
  }
  return input.replace(/.*node_modules/, '/node_modules');
}

function assetNameToSizeMap(statAssets = {}) {
  const children = statAssets?.tree?.children;

  if (!Array.isArray(children) || children.length === 0) {
    return new Map();
  }

  return new Map(
    children.map(asset => {
      const descendants = findAllChildren(asset);
      let size = 0;
      let gzipSize = statAssets?.options?.gzip ? 0 : null;

      for (const mod of descendants) {
        const nodePart = statAssets?.nodeParts?.[mod.uid];

        if (!nodePart) {
          continue;
        }

        size += nodePart.renderedLength ?? 0;

        if (gzipSize !== null) {
          gzipSize += nodePart.gzipLengh ?? 0;
        }
      }

      return [trimPath(asset.name), { size, gzipSize }];
    }),
  );
}

function chunkModuleNameToSizeMap(statChunks = {}) {
  if (!statChunks?.tree) {
    return new Map();
  }

  return new Map(
    findAllChildren(statChunks.tree).map(mod => {
      const modInfo = statChunks?.nodeParts?.[mod.uid] ?? {};
      const meta = statChunks?.nodeMetas?.[modInfo.metaUid] ?? {};
      const id = trimPath(meta.id ?? '');

      return [
        id,
        {
          size: modInfo.renderedLength ?? 0,
          gzipSize: statChunks?.options?.gzip ? (modInfo.gzipLengh ?? 0) : null,
        },
      ];
    }),
  );
}

function sortDiffDescending(items) {
  return items.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}

function normaliseGzip(value) {
  if (value == null || Number.isNaN(value)) {
    return NaN;
  }
  return value;
}

function getAssetDiff(name, oldSize, newSize) {
  const diff = newSize.size - oldSize.size;

  const percent =
    oldSize.size === 0
      ? newSize.size === 0
        ? 0
        : Infinity
      : +((1 - newSize.size / oldSize.size) * -100).toFixed(5) || 0;

  return {
    name,
    new: {
      size: newSize.size,
      gzipSize: normaliseGzip(newSize.gzipSize),
    },
    old: {
      size: oldSize.size,
      gzipSize: normaliseGzip(oldSize.gzipSize),
    },
    diff,
    diffPercentage: percent,
  };
}

function webpackStatsDiff(oldAssets, newAssets) {
  const added = [];
  const removed = [];
  const bigger = [];
  const smaller = [];
  const unchanged = [];

  let newSizeTotal = 0;
  let oldSizeTotal = 0;
  let newGzipSizeTotal = 0;
  let oldGzipSizeTotal = 0;

  for (const [name, oldAssetSizes] of oldAssets) {
    oldSizeTotal += oldAssetSizes.size;
    oldGzipSizeTotal += oldAssetSizes.gzipSize ?? NaN;

    const newAsset = newAssets.get(name);

    if (!newAsset) {
      removed.push(getAssetDiff(name, oldAssetSizes, { size: 0, gzipSize: 0 }));
      continue;
    }

    const diff = getAssetDiff(name, oldAssetSizes, newAsset);

    if (diff.diffPercentage > 0) {
      bigger.push(diff);
    } else if (diff.diffPercentage < 0) {
      smaller.push(diff);
    } else {
      unchanged.push(diff);
    }
  }

  for (const [name, newAssetSizes] of newAssets) {
    newSizeTotal += newAssetSizes.size;
    newGzipSizeTotal += newAssetSizes.gzipSize ?? NaN;

    if (!oldAssets.has(name)) {
      added.push(getAssetDiff(name, { size: 0, gzipSize: 0 }, newAssetSizes));
    }
  }

  const oldFilesCount = oldAssets.size;
  const newFilesCount = newAssets.size;

  return {
    added: sortDiffDescending(added),
    removed: sortDiffDescending(removed),
    bigger: sortDiffDescending(bigger),
    smaller: sortDiffDescending(smaller),
    unchanged,
    total: getAssetDiff(
      oldFilesCount === newFilesCount
        ? `${newFilesCount}`
        : `${oldFilesCount} → ${newFilesCount}`,
      { size: oldSizeTotal, gzipSize: oldGzipSizeTotal },
      { size: newSizeTotal, gzipSize: newGzipSizeTotal },
    ),
  };
}

function getStatsDiff(oldStats, newStats) {
  return webpackStatsDiff(
    assetNameToSizeMap(oldStats),
    assetNameToSizeMap(newStats),
  );
}

function getChunkModuleDiff(oldStats, newStats) {
  const diff = webpackStatsDiff(
    chunkModuleNameToSizeMap(oldStats),
    chunkModuleNameToSizeMap(newStats),
  );

  if (
    diff.added.length === 0 &&
    diff.removed.length === 0 &&
    diff.bigger.length === 0 &&
    diff.smaller.length === 0
  ) {
    return null;
  }

  return diff;
}

const BYTES_PER_KILOBYTE = 1024;
const FILE_SIZE_DENOMINATIONS = [
  'B',
  'kB',
  'MB',
  'GB',
  'TB',
  'PB',
  'EB',
  'ZB',
  'YB',
  'BB',
];

function formatFileSizeIEC(bytes, precision = 2) {
  if (bytes == null || Number.isNaN(bytes)) {
    return 'N/A';
  }

  if (bytes === 0) {
    return `0 ${FILE_SIZE_DENOMINATIONS[0]}`;
  }

  const absBytes = Math.abs(bytes);
  const denominationIndex = Math.floor(
    Math.log(absBytes) / Math.log(BYTES_PER_KILOBYTE),
  );
  const value = absBytes / Math.pow(BYTES_PER_KILOBYTE, denominationIndex);
  const stripped = parseFloat(value.toFixed(precision));

  return `${stripped} ${FILE_SIZE_DENOMINATIONS[denominationIndex]}`;
}

function conditionalPercentage(number) {
  if (number === Infinity || number === -Infinity) {
    return '-';
  }

  const absValue = Math.abs(number);

  if (absValue === 0 || absValue === 100) {
    return `${number}%`;
  }

  const value = Number.isFinite(absValue) ? absValue.toFixed(2) : absValue;
  return `${signFor(number)}${value}%`;
}

function capitalize(text) {
  if (!text) return '';
  return `${text[0].toUpperCase()}${text.slice(1)}`;
}

function makeHeader(columns) {
  const header = columns.join(' | ');
  const separator = columns
    .map(column =>
      Array.from({ length: column.length })
        .map(() => '-')
        .join(''),
    )
    .join(' | ');

  return `${header}\n${separator}`;
}

const TOTAL_HEADERS = makeHeader([
  'Files count',
  'Total bundle size',
  '% Changed',
]);
const TABLE_HEADERS = makeHeader(['Asset', 'File Size', '% Changed']);
const CHUNK_TABLE_HEADERS = makeHeader(['File', 'Δ', 'Size']);

function signFor(num) {
  if (num === 0) return '';
  return num > 0 ? '+' : '-';
}

function toFileSizeDiff(oldSize, newSize, diff) {
  const diffLine = [
    `${formatFileSizeIEC(oldSize)} → ${formatFileSizeIEC(newSize)}`,
  ];

  if (typeof diff !== 'undefined') {
    diffLine.push(`(${signFor(diff)}${formatFileSizeIEC(diff)})`);
  }

  return diffLine.join(' ');
}

function toFileSizeDiffCell(asset) {
  const lines = [];

  if (asset.diff === 0) {
    lines.push(formatFileSizeIEC(asset.new.size));

    if (asset.new.gzipSize) {
      lines.push(formatFileSizeIEC(asset.new.gzipSize));
    }
  } else {
    lines.push(toFileSizeDiff(asset.old.size, asset.new.size, asset.diff));

    if (asset.old.gzipSize || asset.new.gzipSize) {
      lines.push(
        `${toFileSizeDiff(asset.old.gzipSize, asset.new.gzipSize)} (gzip)`,
      );
    }
  }

  return lines.join('<br />');
}

function printAssetTableRow(asset) {
  return [
    asset.name,
    toFileSizeDiffCell(asset),
    conditionalPercentage(asset.diffPercentage),
  ].join(' | ');
}

function printAssetTablesByGroup(statsDiff) {
  const statsFields = ['added', 'removed', 'bigger', 'smaller', 'unchanged'];

  return statsFields
    .map(field => {
      const assets = statsDiff[field] ?? [];

      if (assets.length === 0) {
        return `**${capitalize(field)}**\nNo assets were ${field}`;
      }

      return `**${capitalize(field)}**\n${TABLE_HEADERS}\n${assets
        .map(asset => printAssetTableRow(asset))
        .join('\n')}`;
    })
    .join('\n\n');
}

function getDiffEmoji(diff) {
  if (diff.diffPercentage === Infinity) return '🆕';
  if (diff.diffPercentage <= -100) return '🔥';
  if (diff.diffPercentage > 0) return '📈';
  if (diff.diffPercentage < 0) return '📉';
  return ' ';
}

function getTrimmedChunkName(chunkModule) {
  let chunkName = chunkModule.name ?? '';
  if (chunkName.startsWith('./')) {
    return chunkName.substring(2);
  }
  if (chunkName.startsWith('/')) {
    return chunkName.substring(1);
  }
  return chunkName;
}

function printChunkModuleRow(chunkModule) {
  const emoji = getDiffEmoji(chunkModule);
  const chunkName = getTrimmedChunkName(chunkModule);
  const diffPart = `${chunkModule.diff >= 0 ? '+' : '-'}${formatFileSizeIEC(chunkModule.diff)}`;
  const percentPart = Number.isFinite(chunkModule.diffPercentage)
    ? ` (${conditionalPercentage(chunkModule.diffPercentage)})`
    : '';

  return [
    `\`${chunkName}\``,
    `${emoji} ${diffPart}${percentPart}`,
    `${formatFileSizeIEC(chunkModule.old.size)} → ${formatFileSizeIEC(chunkModule.new.size)}`,
  ].join(' | ');
}

function printChunkModulesTable(statsDiff) {
  if (!statsDiff) {
    return '';
  }

  const changedModules = [
    ...(statsDiff.added ?? []),
    ...(statsDiff.removed ?? []),
    ...(statsDiff.bigger ?? []),
    ...(statsDiff.smaller ?? []),
  ].sort((a, b) => b.diffPercentage - a.diffPercentage);

  if (changedModules.length === 0) {
    return `<details>\n<summary>Changeset</summary>\nNo files were changed\n</details>`;
  }

  const rows = changedModules
    .slice(0, 100)
    .map(chunkModule => printChunkModuleRow(chunkModule))
    .join('\n');

  const summarySuffix =
    changedModules.length > 100 ? ' (largest 100 files by percent change)' : '';

  return `<details>\n<summary>Changeset${summarySuffix}</summary>\n${CHUNK_TABLE_HEADERS}\n${rows}\n</details>`;
}

function printTotalAssetTable(statsDiff) {
  return `**Total**\n${TOTAL_HEADERS}\n${printAssetTableRow(statsDiff.total)}`;
}

function renderSection(title, statsDiff, chunkModuleDiff) {
  const { total, ...groups } = statsDiff;
  const parts = [`#### ${title}`, '', printTotalAssetTable({ total })];

  const chunkTable = printChunkModulesTable(chunkModuleDiff);
  if (chunkTable) {
    parts.push('', chunkTable);
  }

  parts.push(
    '',
    `<details>\n<summary>View detailed bundle breakdown</summary>\n<div>\n${printAssetTablesByGroup(
      groups,
    )}\n</div>\n</details>`,
  );

  return parts.join('\n');
}

async function main() {
  const args = parseArgs(process.argv);

  const webBaseStats = await loadStats(args.webBase);
  const webHeadStats = await loadStats(args.webHead);
  const lootBaseStats = await loadStats(args.lootBase);
  const lootHeadStats = await loadStats(args.lootHead);
  const apiBaseStats = await loadStats(args.apiBase);
  const apiHeadStats = await loadStats(args.apiHead);

  const sections = [
    {
      name: 'desktop-client',
      statsDiff: getStatsDiff(webBaseStats, webHeadStats),
      chunkDiff: getChunkModuleDiff(webBaseStats, webHeadStats),
    },
    {
      name: 'loot-core',
      statsDiff: getStatsDiff(lootBaseStats, lootHeadStats),
      chunkDiff: getChunkModuleDiff(lootBaseStats, lootHeadStats),
    },
    {
      name: 'api',
      statsDiff: getStatsDiff(apiBaseStats, apiHeadStats),
      chunkDiff: getChunkModuleDiff(apiBaseStats, apiHeadStats),
    },
  ];

  const identifier = `<!--- bundlestats-action-comment key:${args.identifier} --->`;

  const comment = [
    '### Bundle Stats',
    '',
    sections
      .map(section =>
        renderSection(section.name, section.statsDiff, section.chunkDiff),
      )
      .join('\n\n---\n\n'),
    '',
    identifier,
    '',
  ].join('\n');

  process.stdout.write(comment);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
