import React from 'react';

export let types = {
  id: {
    name: 'id',
    type: 'string',
    description: (
      <span>
        <a href="https://en.wikipedia.org/wiki/Universally_unique_identifier">
          UUID
        </a>
      </span>
    ),
  },
  month: {
    name: 'month',
    type: 'string',
    description: <code>YYYY-MM</code>,
  },
  date: {
    name: 'date',
    type: 'string',
    description: <code>YYYY-MM-DD</code>,
  },
  amount: {
    name: 'amount',
    type: 'integer',
    description: (
      <span>
        A currency amount is an integer representing the value without any
        decimal places. Usually it’s <code>value * 100</code>, but it depends on
        your currency. For example, a USD amount of <code>$120.30</code> would
        be <code>12030</code>.
      </span>
    ),
  },
};

export let objects = {
  initConfig: [
    {
      name: 'serverURL',
      type: 'string',
      description: <span>The URL of your Actual Budget server.</span>,
    },
    {
      name: 'password',
      type: 'string',
      description: <span>The password of your Actual Budget server.</span>,
    },
    {
      name: 'dataDir',
      type: 'string',
      description: (
        <span>The directory to store locally cached budget files.</span>
      ),
    },
    {
      name: 'verbose',
      type: 'boolean',
      description: <span>Enable/disable logging from actual internals</span>,
    },
  ],

  transaction: [
    {
      name: 'id',
      type: types.id,
    },
    { name: 'account', type: types.id, required: true },
    { name: 'date', type: 'date', required: true },
    { name: 'amount', type: types.amount },
    {
      name: 'payee',
      type: types.id,
      description: (
        <span>
          In a <a href="#types-of-methods">create</a> request, this overrides{' '}
          <code>payee_name</code>.
        </span>
      ),
    },
    {
      name: 'payee_name',
      type: 'string',
      description: (
        <div>
          <div className="mb-6">
            If given, a payee will be created with this name. If this matches an
            already existing payee, that payee will be used.
          </div>
          * Only available in a <a href="#types-of-methods">create</a> request
        </div>
      ),
    },
    {
      name: 'imported_payee',
      type: 'string',
      description:
        'This can be anything. Meant to represent the raw description when importing, allowing the user to see the original value.',
    },
    { name: 'category', type: types.id },
    { name: 'notes', type: 'string' },
    {
      name: 'imported_id',
      type: 'string',
      description:
        'A unique id usually given by the bank, if importing. Use this to avoid duplicate transactions.',
    },
    {
      name: 'transfer_id',
      type: 'string',
      description: (
        <span>
          If a transfer, the <code>id</code> of the corresponding transaction in
          the other account. See <a href="#transfers">transfers</a>.
        </span>
      ),
    },
    {
      name: 'cleared',
      type: 'boolean',
      description: (
        <span>A flag indicating if the transaction has cleared or not.</span>
      ),
    },
    {
      name: 'subtransactions',
      type: 'Transaction[]',
      description: (
        <div>
          <div className="mb-6">
            An array of subtransactions for a split transaction. See{' '}
            <a href="#split-transactions">split transactions</a>.
          </div>
          * Only available in a <a href="#types-of-methods">get</a> or{' '}
          <a href="#types-of-methods">create</a> request
        </div>
      ),
    },
  ],

  account: [
    { name: 'id', type: types.id },
    { name: 'name', type: 'string', required: true },
    {
      name: 'offbudget',
      type: 'bool',
      description: (
        <span>
          Defaults to <code>false</code>
        </span>
      ),
    },
    {
      name: 'closed',
      type: 'bool',
      description: (
        <span>
          Defaults to <code>false</code>
        </span>
      ),
    },
  ],

  category: [
    { name: 'id', type: types.id },
    { name: 'name', type: 'string', required: true },
    { name: 'group_id', type: types.id, required: true },
    {
      name: 'is_income',
      type: 'bool',
      description: (
        <span>
          Defaults to <code>false</code>
        </span>
      ),
    },
  ],

  categoryGroup: [
    { name: 'id', type: types.id },
    { name: 'name', type: 'string', required: true },
    {
      name: 'is_income',
      type: 'bool',
      description: (
        <span>
          Defaults to <code>false</code>
        </span>
      ),
    },
    {
      name: 'categories',
      type: 'Category[]',
      description: (
        <div>
          <div className="mb-6">
            An array of categories in this group. Not valid when creating or
            updating a category group
          </div>
          Only available in a <code>get</code>.
        </div>
      ),
    },
  ],

  schedule: [
    {
      name: 'id',
      type: types.id,
    },
    {
      name: 'name',
      type: 'string',
      description: (
        <span>Not mandatory but schedule names must be unique.</span>
      ),
    },
    {
      name: 'rule',
      type: 'string',
      description: (
        <span>
          All schedules have an associated underlying rule. Not to be supplied
          with a new schedule. It will be auto created. Rules can not updated to
          another rule. You can however edit the rule with the API above for
          Rule.
        </span>
      ),
    },
    {
      name: 'next_date',
      type: 'string',
      description: (
        <span>
          Next occurrence of a schedule. Not to be supplied with a new schedule.
        </span>
      ),
    },
    {
      name: 'completed',
      type: 'boolean',
      description: <span>Not to be supplied with a new schedule.</span>,
    },
    {
      name: 'posts_transaction',
      type: 'boolean',
      description: (
        <span>
          Whether the schedule should auto-post transactions on your behalf.
          Defaults to <code>false</code>.
        </span>
      ),
    },
    {
      name: 'payee',
      type: 'id | null',
      description: (
        <span>
          Optional; will default to <code>null</code>.
        </span>
      ),
    },
    {
      name: 'account',
      type: 'id | null',
      description: (
        <span>
          Optional; will default to <code>null</code>.
        </span>
      ),
    },
    {
      name: 'amount',
      type: 'number | { num1: number; num2: number }',
      description: (
        <span>
          Provide only one number, except if the amount uses a isbetween in
          amountOp, in this case num1 and 2 should be provided.
        </span>
      ),
    },
    {
      name: 'amountOp',
      type: "'is' | 'isapprox' | 'isbetween'",
      description: (
        <span>
          Controls how <code>amount</code> is interpreted.
        </span>
      ),
    },
    {
      name: 'date',
      type: 'date | RecurConfig',
      required: true,
      description: (
        <span>
          Mandatory field when creating a schedule. If the schedule is a single
          occurrence just supply the date. otherwise refer to RecurConfig
          details below.
        </span>
      ),
    },
  ],

  recurConfig: [
    {
      name: 'frequency',
      type: `'daily' | 'weekly' | 'monthly' | 'yearly'`,
      required: true,
      description: <span>How often the schedule repeats.</span>,
    },
    {
      name: 'interval',
      type: 'number',
      description: (
        <span>
          The interval at which the recurrence happens. Defaults to{' '}
          <code>1</code> if omitted.
        </span>
      ),
    },
    {
      name: 'patterns',
      type: 'RecurPattern[]',
      description: (
        <span>
          Optional patterns to control specific dates for recurrence (e.g.
          certain weekdays or month days).
        </span>
      ),
    },
    {
      name: 'skipWeekend',
      type: 'boolean',
      description: (
        <span>If true, skips weekends when calculating recurrence dates.</span>
      ),
    },
    {
      name: 'start',
      type: 'string',
      required: true,
      description: (
        <span>
          The ISO date string indicating the start date of the recurrence.
        </span>
      ),
    },
    {
      name: 'endMode',
      type: `'never' | 'after_n_occurrences' | 'on_date'`,
      required: true,
      description: (
        <span>
          Specifies how the recurrence ends: never ends, after a number of
          occurrences, or on a specific date.
        </span>
      ),
    },
    {
      name: 'endOccurrences',
      type: 'number',
      description: (
        <span>
          Used when <code>endMode</code> is <code>'after_n_occurrences'</code>.
          Indicates how many times it should repeat.
        </span>
      ),
    },
    {
      name: 'endDate',
      type: 'string',
      description: (
        <span>
          Used when <code>endMode</code> is <code>'on_date'</code>. The ISO date
          string indicating when the recurrence should end.
        </span>
      ),
    },
    {
      name: 'weekendSolveMode',
      type: `'before' | 'after'`,
      description: (
        <span>
          If a calculated date falls on a weekend and <code>skipWeekend</code>{' '}
          is true, this controls whether the date moves to the{' '}
          <code>before</code> or <code>after</code> weekday.
        </span>
      ),
    },
  ],

  payee: [
    { name: 'id', type: types.id },
    { name: 'name', type: 'string', required: true },
    { name: 'category', type: types.id },
    {
      name: 'transfer_acct',
      type: types.id,
      description: (
        <span>
          The <code>id</code> of the account this payee transfers to/from, if
          this is a transfer payee.
        </span>
      ),
    },
  ],

  condition: [
    { name: 'field', type: 'string', required: true },
    { name: 'op', type: 'string', required: true },
    { name: 'value', type: 'string', required: true },
  ],

  rule: [
    { name: 'id', type: types.id },
    {
      name: 'stage',
      type: 'string',
      required: true,
      description: (
        <span>
          Must be one of <code>pre</code>, <code>default</code>, or{' '}
          <code>post</code>.
        </span>
      ),
    },
    {
      name: 'conditionsOp',
      type: 'string',
      description: (
        <span>
          Must be one of <code>and</code> or <code>or</code>.
        </span>
      ),
    },
    { name: 'conditions', type: 'ConditionOrAction[]' },
    { name: 'actions', type: 'ConditionOrAction[]' },
  ],

  payeeRule: [
    { name: 'id', type: types.id },
    { name: 'payee_id', type: types.id, required: true },
    {
      name: 'stage',
      type: 'string',
      required: true,
      description: (
        <span>
          Must be one of <code>pre</code>, <code>default</code>, or{' '}
          <code>post</code>.
        </span>
      ),
    },
    {
      name: 'conditionsOp',
      type: 'string',
      description: (
        <span>
          Must be one of <code>and</code> or <code>or</code>.
        </span>
      ),
    },
    { name: 'conditions', type: 'ConditionOrAction[]' },
    { name: 'actions', type: 'ConditionOrAction[]' },
  ],

  budgetFile: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: <span>The budget's name.</span>,
    },
    {
      name: 'cloudFileId',
      type: 'string',
      required: true,
      description: (
        <span>
          The id for the budget on the server. This is usually a UUID.
        </span>
      ),
    },
    {
      name: 'groupId',
      type: 'string',
      required: true,
      description: <span>The group id for the budget.</span>,
    },
    {
      name: 'hasKey',
      type: 'boolean',
      required: true,
      description: <span>If the file has an encryption key.</span>,
    },
    {
      name: 'encryptKeyId',
      type: 'string',
      description: (
        <span>The encryption key ID for the file, if it is encrypted.</span>
      ),
    },
    {
      name: 'state',
      type: 'string',
      description: <span>Remote files have this set to "remote".</span>,
    },
    {
      name: 'id',
      type: 'string',
      description: <span>The local budget file's local ID.</span>,
    },
  ],
};

function Table({ style, headers, className, children }) {
  return (
    <table className={`text-sm ${className}`} style={style}>
      <thead>
        <tr>
          {headers.map(header => (
            <th key={header} className="text-gray-900 font-thin">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="border">{children}</tbody>
    </table>
  );
}

export function PrimitiveTypeList() {
  return (
    <Table headers={['Name', 'Type', 'Notes']} style={{ maxWidth: 700 }}>
      {Object.keys(types).map(name => {
        return (
          <PrimitiveType
            key={name}
            name={types[name].name}
            type={types[name].type}
            description={types[name].description}
          />
        );
      })}
    </Table>
  );
}

export function PrimitiveType({ name, type, description }) {
  return (
    <tr>
      <td valign="top">
        <code>{name}</code>
      </td>
      <td valign="top">
        <code className="text-gray-600">{type}</code>
      </td>
      <td>{description}</td>
    </tr>
  );
}

export function StructType({ fields }) {
  return (
    <div className="struct mt-4 mb-10">
      <Table
        className="mb-0"
        showBorder={true}
        headers={['Field', 'Type', 'Required?', 'Notes']}
      >
        {fields.map(field => {
          return (
            <tr key={field.name}>
              <td valign="top">
                <code>{field.name}</code>
              </td>
              <td valign="top">
                <code className="text-gray-600">
                  {typeof field.type === 'string'
                    ? field.type
                    : field.type.name}
                </code>
              </td>
              <td valign="top">{field.required ? 'yes' : 'no'}</td>
              <td>{field.description}</td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

function Argument({ arg }) {
  if (arg.properties) {
    return (
      <span>
        {arg.name ? arg.name + ': ' : ''}
        {'{ '}
        {arg.properties
          .map(prop => <Argument key={prop.name} arg={prop} />)
          .map(insertCommas)}
        {' }'}
      </span>
    );
  }
  return (
    <span style={{ position: 'relative' }}>
      <span
        className="text-gray-500"
        style={{ position: 'absolute', bottom: -20, fontSize: 12 }}
      >
        {arg.type}
      </span>
      {arg.name}
    </span>
  );
}

function insertCommas(element, i, arr) {
  if (i === arr.length - 1) {
    return element;
  }
  return [element, ', '];
}

export function Method({ name, args, returns = 'Promise<null>', children }) {
  return (
    <p className="method">
      <div className="p-4 pb-6 rounded border-b bg-gray-100 overflow-auto">
        <code className="text-blue-800">
          {name}(
          {args
            .map(arg => <Argument key={arg.name} arg={arg} />)
            .map(insertCommas)}
          ) <span className="text-gray-500">&rarr; {returns}</span>
        </code>
      </div>
      {children && React.cloneElement(children, {})}
    </p>
  );
}

export function MethodBox({ children }) {
  return <div style={{ border: '1px solid red' }}>{children}</div>;
}
