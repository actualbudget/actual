# DB Migrations Guide

There are some important considerations to make when adding a feature with a db migration.

- DB Migrations will require publishing a new API version as the migrations also need to be applied there.

- The AQL Schema file will likely need to be updated to match any table changes.

- You must place your migration file in the `loot-core/migrations` folder, with a strict naming convention.

- The naming convention is as follows: `TIMESTAMP_name.sql`. for example. `1694438752000_add_goal_targets.sql`

- It is strongly discouraged to try to remove columns and tables. This makes reverting changes impossible and introduces unnecessary risk when we can simply stop using them in code.

- You should be very deliberate with your migration. When adding a feature, try to think about future scenarios and options that may be desired later, so we can minimize the number of migrations.
