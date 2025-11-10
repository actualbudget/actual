# Database Details

Actual stores your data locally inside a SQLite database. You can see the default db structure by opening `/loot-core/default-db.sqlite`

However this is not the 'current' structure, as the database is created as a copy from the default template, and then a series of migrations is run to get the database up to the current level. You can see these migrations in `/loot-core/migrations`.

On the front end, Actual sometimes uses views to display data. All the names with the `v_` prefix are actually views, not tables. The views are recreated every time the app starts and normalize the shape of the data to the internal tables. this makes it easy to change field names etc. without actually touching the tables (especially important in this local-first world where syncing directly references tables and fields).

Much of the interesting functionality you might be curious about can be found in `/loot-core/src/server/db`
