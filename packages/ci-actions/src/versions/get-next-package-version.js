function parseVersion(version) {
  const [y, m, p] = version.split('.');
  return {
    versionYear: parseInt(y, 10),
    versionMonth: parseInt(m, 10),
    versionHotfix: parseInt(p, 10),
  };
}

function computeNextMonth(versionYear, versionMonth) {
  // Create date and add 1 month
  const versionDate = new Date(2000 + versionYear, versionMonth - 1, 1); // month is 0-indexed
  const nextVersionMonthDate = new Date(
    versionDate.getFullYear(),
    versionDate.getMonth() + 1,
    1,
  );

  // Format back to YY.M format
  const fullYear = nextVersionMonthDate.getFullYear();
  const nextVersionYear = fullYear.toString().slice(fullYear < 2100 ? -2 : -3);
  const nextVersionMonth = nextVersionMonthDate.getMonth() + 1; // Convert back to 1-indexed
  return { nextVersionYear, nextVersionMonth };
}

// Determine logical type from 'auto' based on the current date and version
function resolveType(type, currentDate, versionYear, versionMonth) {
  if (type !== 'auto') return type;
  const inPatchMonth =
    currentDate.getFullYear() === 2000 + versionYear &&
    currentDate.getMonth() + 1 === versionMonth;
  if (inPatchMonth && currentDate.getDate() <= 25) return 'hotfix';
  return 'monthly';
}

export function getNextVersion({
  currentVersion,
  type,
  currentDate = new Date(),
}) {
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

  // Format date stamp once for nightly
  const currentDateString = currentDate
    .toISOString()
    .split('T')[0]
    .replaceAll('-', '');

  switch (resolvedType) {
    case 'nightly':
      return `${nextVersionYear}.${nextVersionMonth}.0-nightly.${currentDateString}`;
    case 'hotfix':
      return `${versionYear}.${versionMonth}.${versionHotfix + 1}`;
    case 'monthly':
      return `${nextVersionYear}.${nextVersionMonth}.0`;
    default:
      throw new Error(
        'Invalid type specified. Use "auto", "nightly", "hotfix", or "monthly".',
      );
  }
}
