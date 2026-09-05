import {
  makeBackupFilename,
  parseBackupFilename,
  selectBackupsToRemove,
} from './backups';

const TODAY = '2017-01-01';

function backup(id: string, iso: string) {
  return { id, date: new Date(iso) };
}

describe('selectBackupsToRemove', () => {
  test('keeps up to three backups on the current day', () => {
    const removed = selectBackupsToRemove(
      [
        backup('b1', '2017-01-01T10:00:00'),
        backup('b2', '2017-01-01T11:00:00'),
        backup('b3', '2017-01-01T12:00:00'),
        backup('b4', '2017-01-01T13:00:00'),
      ],
      TODAY,
    );

    expect(removed).toEqual(['b1']);
  });

  test('keeps one backup per earlier day', () => {
    const removed = selectBackupsToRemove(
      [
        backup('today1', '2017-01-01T10:00:00'),
        backup('old1', '2016-12-29T10:00:00'),
        backup('old2', '2016-12-29T11:00:00'),
        backup('old3', '2016-12-29T12:00:00'),
        backup('other', '2016-12-30T09:00:00'),
      ],
      TODAY,
    );

    expect(removed.sort()).toEqual(['old1', 'old2']);
  });

  test('keeps at most ten backups in total', () => {
    const backups = Array.from({ length: 12 }, (_, index) =>
      backup(`day${index}`, `2016-12-${String(20 + index).padStart(2, '0')}`),
    );
    // day0 is 2016-12-20 (oldest) ... day11 is 2016-12-31 (newest)

    const removed = selectBackupsToRemove(backups, TODAY);

    expect(removed.sort()).toEqual(['day0', 'day1']);
  });

  test('does not depend on input order', () => {
    const ordered = [
      backup('b1', '2017-01-01T10:00:00'),
      backup('b2', '2017-01-01T11:00:00'),
      backup('b3', '2017-01-01T12:00:00'),
      backup('b4', '2017-01-01T13:00:00'),
    ];
    const shuffled = [ordered[2], ordered[0], ordered[3], ordered[1]];

    expect(selectBackupsToRemove(shuffled, TODAY)).toEqual(
      selectBackupsToRemove(ordered, TODAY),
    );
  });

  test('returns nothing when everything fits', () => {
    const removed = selectBackupsToRemove(
      [
        backup('b1', '2017-01-01T10:00:00'),
        backup('b2', '2016-12-31T10:00:00'),
      ],
      TODAY,
    );

    expect(removed).toEqual([]);
  });
});

describe('backup filenames', () => {
  test('round-trips through make and parse', () => {
    const date = new Date(2017, 0, 1, 13, 45, 9);
    const name = makeBackupFilename(date);

    expect(name).toBe('2017-01-01_13-45-09.zip');
    expect(parseBackupFilename(name)).toEqual(date);
  });

  test('rejects names that are not backups', () => {
    expect(parseBackupFilename('db.latest.sqlite')).toBeNull();
    expect(parseBackupFilename('notes.txt')).toBeNull();
    expect(parseBackupFilename('2017-01-01.zip')).toBeNull();
    expect(parseBackupFilename('2017-13-40_99-99-99.zip')).toBeNull();
  });
});
