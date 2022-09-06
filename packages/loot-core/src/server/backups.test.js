import { updateBackups } from './backups';

const dateFns = require('date-fns');

describe('Backups', () => {
  test('backups work', async () => {
    async function getUpdatedBackups(backups) {
      const toRemove = await updateBackups(backups);
      return backups.filter(b => !toRemove.includes(b.id));
    }

    function cleanDates(backups) {
      return backups.map(backup => ({
        id: backup.id,
        date: dateFns.format(backup.date, 'yyyy-MM-dd')
      }));
    }

    // Should keep 3 backups on the current day
    expect(
      cleanDates(
        await getUpdatedBackups([
          { id: 'backup1', date: dateFns.parseISO('2017-01-01') },
          { id: 'backup2', date: dateFns.parseISO('2017-01-01') },
          { id: 'backup3', date: dateFns.parseISO('2017-01-01') },
          { id: 'backup4', date: dateFns.parseISO('2017-01-01') }
        ])
      )
    ).toMatchSnapshot();

    // Should not delete any since up to 3 are allowed on the current
    // day
    expect(
      cleanDates(
        await getUpdatedBackups([
          { id: 'backup1', date: dateFns.parseISO('2017-01-01') },
          { id: 'backup2', date: dateFns.parseISO('2017-01-01') },
          { id: 'backup3', date: dateFns.parseISO('2016-12-30') },
          { id: 'backup4', date: dateFns.parseISO('2016-12-29') }
        ])
      )
    ).toMatchSnapshot();

    // Should delete any additional backups on other days (keep the
    // two on the current day but delete copies on other days)
    expect(
      cleanDates(
        await getUpdatedBackups([
          { id: 'backup1', date: dateFns.parseISO('2017-01-01') },
          { id: 'backup2', date: dateFns.parseISO('2017-01-01') },
          { id: 'backup3', date: dateFns.parseISO('2016-12-29') },
          { id: 'backup4', date: dateFns.parseISO('2016-12-29') },
          { id: 'backup5', date: dateFns.parseISO('2016-12-29') }
        ])
      )
    ).toMatchSnapshot();

    // Should only keep up to 10 backups
    expect(
      cleanDates(
        await getUpdatedBackups([
          { id: 'backup1', date: dateFns.parseISO('2017-01-01') },
          { id: 'backup2', date: dateFns.parseISO('2017-01-01') },
          { id: 'backup3', date: dateFns.parseISO('2016-12-29') },
          { id: 'backup4', date: dateFns.parseISO('2016-12-28') },
          { id: 'backup5', date: dateFns.parseISO('2016-12-27') },
          { id: 'backup6', date: dateFns.parseISO('2016-12-26') },
          { id: 'backup7', date: dateFns.parseISO('2016-12-25') },
          { id: 'backup8', date: dateFns.parseISO('2016-12-24') },
          { id: 'backup9', date: dateFns.parseISO('2016-12-23') },
          { id: 'backup10', date: dateFns.parseISO('2016-12-22') },
          { id: 'backup11', date: dateFns.parseISO('2016-12-21') },
          { id: 'backup12', date: dateFns.parseISO('2016-12-20') }
        ])
      )
    ).toMatchSnapshot();
  });
});
