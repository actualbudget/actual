export const versionTypeArray = [
  'auto',
  'hotfix',
  'monthly',
  'nightly',
] as const;
export type VersionType = (typeof versionTypeArray)[number];

type ParsedVersion = {
  versionYear: number;
  versionMonth: number;
  versionHotfix: number;
};

type GetNextVersionOptions = {
  currentVersion: string;
  type: VersionType;
  currentDate?: Date;
};

function parseVersion(version: string): ParsedVersion {
  const [y, m, p] = version.split('.');
  return {
    versionYear: Number.parseInt(y, 10),
    versionMonth: Number.parseInt(m, 10),
    versionHotfix: Number.parseInt(p, 10),
  };
}

function computeNextMonth(versionYear: number, versionMonth: number) {
  const versionDate = new Date(2000 + versionYear, versionMonth - 1, 1);
  const nextVersionMonthDate = new Date(
    versionDate.getFullYear(),
    versionDate.getMonth() + 1,
    1,
  );

  const fullYear = nextVersionMonthDate.getFullYear();
  const nextVersionYear = fullYear.toString().slice(fullYear < 2100 ? -2 : -3);
  const nextVersionMonth = nextVersionMonthDate.getMonth() + 1;

  return { nextVersionYear, nextVersionMonth };
}

export function isValidVersionType(value: string): value is VersionType {
  return versionTypeArray.includes(value as VersionType);
}

function resolveType(
  type: VersionType,
  currentDate: Date,
  versionYear: number,
  versionMonth: number,
) {
  if (type !== 'auto') {
    return type;
  }

  const inPatchMonth =
    currentDate.getFullYear() === 2000 + versionYear &&
    currentDate.getMonth() + 1 === versionMonth;

  if (inPatchMonth && currentDate.getDate() < 25) {
    return 'hotfix';
  }

  return 'monthly';
}

export function getNextVersion({
  currentVersion,
  type,
  currentDate = new Date(),
}: GetNextVersionOptions) {
  const { versionYear, versionMonth, versionHotfix } =
    parseVersion(currentVersion);
  const { nextVersionYear, nextVersionMonth } = computeNextMonth(
    versionYear,
    versionMonth,
  );
  const resolvedType = resolveType(
    type,
    currentDate,
    versionYear,
    versionMonth,
  );

  const currentDateString = currentDate
    .toISOString()
    .split('T')[0]
    .replace(/-/g, '');

  switch (resolvedType) {
    case 'nightly':
      return `${nextVersionYear}.${nextVersionMonth}.0-nightly.${currentDateString}`;
    case 'hotfix':
      return `${versionYear}.${versionMonth}.${versionHotfix + 1}`;
    case 'monthly':
      return `${nextVersionYear}.${nextVersionMonth}.0`;
    default:
      throw new Error(
        `Invalid type ${String(resolvedType satisfies never)} specified. Use "auto", "nightly", "hotfix", or "monthly".`,
      );
  }
}
