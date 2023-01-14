function f(type, opts) {
  return { type, ...opts };
}

// This is the table schema!
//
// The schema itself is the public API for querying and updating data.
// The schema config provides a lot of control over how queries are
// constructed other metadata used by the executors. The goal is to
// provide a simple interface to the app, but allow the backend to
// highly optimize how queries are run.
//
// A few notes:
//
// * `transactions` is a special table and is has a highly customized
// executor (see `executors.js`) for performace. It should mostly be
// transparent to you, but it's worth reading the comments in there if
// requirements change, especially regarding split transactions.
//
// * You should rarely change the schema and only add to it, but it is
// relatively safe to change if needed. The only problem is changing a
// public API, but that could be mitigated with an option in schema
// config to map field name for backwards compatibility.
//
// * It's important that the table names here in the schema map to the
// real tables in sqlite that are updated. Otherwise subscriptions
// might not work because the dependencies are wrong. If needed in the
// future, we can provide another option in the schema config to map a
// table name the internal table that is updated.

export const schema = {
  transactions: {
    id: f('id'),
    is_parent: f('boolean'),
    is_child: f('boolean'),
    parent_id: f('id'),
    account: f('id', { ref: 'accounts', required: true }),
    category: f('id', { ref: 'categories' }),
    amount: f('integer', { default: 0, required: true }),
    payee: f('id', { ref: 'payees' }),
    notes: f('string'),
    date: f('date', { required: true }),
    imported_id: f('string'),
    error: f('json'),
    imported_payee: f('string'),
    starting_balance_flag: f('boolean'),
    transfer_id: f('id'),
    sort_order: f('float', { default: () => Date.now() }),
    cleared: f('boolean', { default: true }),
    tombstone: f('boolean'),
    schedule: f('id', { ref: 'schedules' })
    // subtransactions is a special field added if the table has the
    // `splits: grouped` option
  },
  payees: {
    id: f('id'),
    name: f('string', { required: true }),
    transfer_acct: f('id', { ref: 'accounts' }),
    tombstone: f('boolean')
  },
  accounts: {
    id: f('id'),
    name: f('string', { required: true }),
    // TODO: enum
    type: f('string'),
    offbudget: f('boolean'),
    closed: f('boolean'),
    sort_order: f('float'),
    tombstone: f('boolean')
  },
  categories: {
    id: f('id'),
    name: f('string'),
    is_income: f('boolean'),
    group: f('id', { ref: 'category_groups' }),
    sort_order: f('float'),
    tombstone: f('boolean')
  },
  category_groups: {
    id: f('id'),
    name: f('string'),
    is_income: f('boolean'),
    sort_order: f('float'),
    tombstone: f('boolean')
  },
  schedules: {
    id: f('id'),
    rule: f('id', { ref: 'rules', required: true }),
    next_date: f('date'),
    completed: f('boolean'),
    posts_transaction: f('boolean'),
    tombstone: f('boolean'),

    // These are special fields that are actually pulled from the
    // underlying rule
    _payee: f('id', { ref: 'payees' }),
    _account: f('id', { ref: 'accounts' }),
    _amount: f('json/fallback'),
    _amountOp: f('string'),
    _date: f('json/fallback'),
    _conditions: f('json'),
    _actions: f('json')
  },
  rules: {
    id: f('id'),
    stage: f('string'),
    conditions: f('json'),
    actions: f('json'),
    tombstone: f('boolean')
  },
  notes: {
    id: f('id'),
    note: f('string')
  }
};

export const schemaConfig = {
  // Note: these views *must* represent the underlying table that we
  // are mapping here. The compiler makes optimizations with this
  // assumption
  tableViews(name, { isJoin, withDead, tableOptions = {} }) {
    switch (name) {
      case 'transactions': {
        // If joining, we always only show alive transactions. There's
        // no way to configure join behavior yet
        if (isJoin) {
          return 'v_transactions_internal_alive';
        }

        let splitType = tableOptions.splits || 'inline';
        // Use the view to exclude dead transactions if using `inline` or `none`
        if (!withDead && (splitType === 'inline' || splitType === 'none')) {
          return 'v_transactions_internal_alive';
        }

        // Otherwse we disregard the `withDead` option here and handle
        // that in the executors to improve performance
        return 'v_transactions_internal';
      }

      case 'schedules':
        return 'v_schedules';

      case 'categories':
        return 'v_categories';

      case 'payees':
        return 'v_payees';

      default:
    }
    return name;
  },

  customizeQuery(queryState) {
    let { table: tableName } = queryState;

    function orderBy(orders) {
      // If order was specified, always add id as the last sort to make
      // it deterministic
      if (orders.length > 0) {
        return orders.concat(['id']);
      }

      // Otherwise, these are the default orders for each table
      switch (tableName) {
        case 'transactions':
          return [
            { date: 'desc' },
            'starting_balance_flag',
            { sort_order: 'desc' },
            'id'
          ];
        case 'payees':
          return [
            { $condition: { transfer_acct: null }, $dir: 'desc' },
            { $nocase: '$name' }
          ];
        case 'accounts':
          return ['sort_order', 'name'];
        case 'schedules':
          return [{ $condition: { completed: true } }, 'next_date'];
        default:
      }

      return [];
    }

    return {
      ...queryState,
      orderExpressions: orderBy(queryState.orderExpressions)
    };
  },

  views: {
    payees: {
      v_payees: internalFields => {
        let fields = internalFields({
          name: 'COALESCE(__accounts.name, _.name)'
        });

        return `
          SELECT ${fields} FROM payees _
          LEFT JOIN accounts __accounts ON (_.transfer_acct = __accounts.id AND __accounts.tombstone = 0)
          -- We never want to show transfer payees that are pointing to deleted accounts.
          -- Either this isn't a transfer payee, if the account exists
          WHERE _.transfer_acct IS NULL OR __accounts.id IS NOT NULL
        `;
      }
    },

    categories: {
      fields: {
        group: 'cat_group'
      },

      v_categories: internalFields => {
        let fields = internalFields({ group: 'cat_group' });
        return `SELECT ${fields} FROM categories _`;
      }
    },

    schedules: {
      v_schedules: internalFields => {
        let fields = internalFields({
          next_date: `
            CASE
              WHEN _nd.local_next_date_ts = _nd.base_next_date_ts THEN _nd.local_next_date
              ELSE _nd.base_next_date
            END
          `,
          _payee: `pm.targetId`,
          _account: `json_extract(_rules.conditions, _paths.account || '.value')`,
          _amount: `json_extract(_rules.conditions, _paths.amount || '.value')`,
          _amountOp: `json_extract(_rules.conditions, _paths.amount || '.op')`,
          _date: `json_extract(_rules.conditions, _paths.date || '.value')`,
          _conditions: '_rules.conditions',
          _actions: '_rules.actions'
        });

        return `
          SELECT ${fields} FROM schedules _
          LEFT JOIN schedules_next_date _nd ON _nd.schedule_id = _.id
          LEFT JOIN schedules_json_paths _paths ON _paths.schedule_id = _.id
          LEFT JOIN rules _rules ON _rules.id = _.rule
          LEFT JOIN payee_mapping pm ON pm.id = json_extract(_rules.conditions, _paths.payee || '.value')
        `;
      }
    },

    transactions: {
      fields: {
        is_parent: 'isParent',
        is_child: 'isChild',
        account: 'acct',
        imported_id: 'financial_id',
        imported_payee: 'imported_description',
        transfer_id: 'transferred_id',
        payee: 'description'
      },

      v_transactions_internal: internalFields => {
        // Override some fields to make custom stuff
        let fields = internalFields({
          payee: 'pm.targetId',
          category: `CASE WHEN _.isParent = 1 THEN NULL ELSE cm.transferId END`,
          amount: `IFNULL(_.amount, 0)`,
          parent_id: 'CASE WHEN _.isChild = 0 THEN NULL ELSE _.parent_id END'
        });

        return `
          SELECT ${fields} FROM transactions _
          LEFT JOIN category_mapping cm ON cm.id = _.category
          LEFT JOIN payee_mapping pm ON pm.id = _.description
          WHERE
           _.date IS NOT NULL AND
           _.acct IS NOT NULL AND
           (_.isChild = 0 OR _.parent_id IS NOT NULL)
        `;
      },

      // We join on t2 to only include valid child transactions. We
      // want to only include ones with valid parents, which is when
      // an alive parent transaction exists
      v_transactions_internal_alive: `
        SELECT _.* FROM v_transactions_internal _
        LEFT JOIN transactions t2 ON (_.is_child = 1 AND t2.id = _.parent_id)
        WHERE IFNULL(_.tombstone, 0) = 0 AND (_.is_child = 0 OR t2.tombstone = 0)
      `,

      v_transactions: (_, publicFields) => {
        let fields = publicFields({
          payee: 'p.id',
          category: 'c.id',
          account: 'a.id'
        });

        // This adds an order, and also validates any id references by
        // selecting the ids through a join which return null if they
        // are dead
        return `
          SELECT ${fields} FROM v_transactions_internal_alive _
          LEFT JOIN payees p ON (p.id = _.payee AND p.tombstone = 0)
          LEFT JOIN categories c ON (c.id = _.category AND c.tombstone = 0)
          LEFT JOIN accounts a ON (a.id = _.account AND a.tombstone = 0)
          ORDER BY _.date desc, _.starting_balance_flag, _.sort_order desc, _.id;
        `;
      }
    }
  }
};
