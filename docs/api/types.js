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
            already existing payee, it will use it.
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
        'A unique id usually given by the bank, if importing. Use this is avoid duplicate transactions.',
    },
    {
      name: 'transfer_id',
      type: 'string',
      description: (
        <span>
          If a transfer, the <code>id</code> of the transaction in the other
          account for the transfer. See <a href="#transfers">transfers</a>.
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
      name: 'type',
      type: 'string',
      required: true,
      description: 'Must be a valid type. See notes below.',
    },
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
            Must be one of <code>pre</code>, <code>default</code>, or <code>post</code>.
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
            Must be one of <code>pre</code>, <code>default</code>, or <code>post</code>.
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
};

function Table({ style, headers, className, children }) {
  return (
    <table className={`text-sm ${className}`} style={style}>
      <thead>
        <tr>
          {headers.map(header => (
            <th className="text-gray-900 font-thin">{header}</th>
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

export function StructType({ name, fields }) {
  return (
    <div className="struct mt-4 mb-10">
      <Table
        className="mb-0"
        showBorder={true}
        headers={['Field', 'Type', 'Required?', 'Notes']}
      >
        {fields.map(field => {
          return (
            <tr>
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
        {arg.properties.map(prop => <Argument arg={prop} />).map(insertCommas)}
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
          {name}({args.map(arg => <Argument arg={arg} />).map(insertCommas)}){' '}
          <span className="text-gray-500">&rarr; {returns}</span>
        </code>
      </div>
      {children && React.cloneElement(children, {})}
    </p>
  );
}

export function MethodBox({ children }) {
  return <div style={{ border: '1px solid red' }}>{children}</div>;
}
