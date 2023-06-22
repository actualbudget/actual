import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { send } from 'loot-core/src/platform/client/fetch';
import { generateSQL } from 'loot-core/src/server/aql/compiler';
import { ButtonWithLoading, Input, View } from '../common';
import { Error } from '../alerts';
import { Page } from '../Page';
import { schema, schemaConfig } from 'loot-core/src/server/aql/schema/index';
import q from 'loot-core/src/client/query-helpers';
import { Table, Row, Field, Cell, SelectCell } from '../table';

function useData(query: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const run = async () => {
      try {
        console.log('run', query);
        const results = await runQuery(query);
        console.log('res', results);
        setData(results.data);
      } catch (error) {
        console.log('error', error);
        setError(error);
      }
      setIsLoading(false);
    };

    run();
  }, [query]);

  return {
    isLoading,
    data,
    error,
  };
}

export async function runQuery(query: string) {
  return send('sql-query', query, { catchErrors: true });
}

const zzz = q('transactions')
  // .filter({ id: '205b1f5c-2f9f-4ffe-8132-2601143af904' })
  // .filter({ amount: { $lte: -1200 } })
  // .filter({ 'payee.name': 'T-mobile' })
  .select(['amount', 'payee.name']);
// .select(['*']);
const aql = zzz.serialize();
const startQuery = generateSQL(aql, schema, schemaConfig);

/**
 * TODO:
 * - ability to format the query via button click
 * - ability to export via button click
 * - documentation
 * - persist active query to url?
 * - show errors if they occur
 */

// SELECT * FROM v_transactions_internal_alive    WHERE (v_transactions_internal_alive.id = '205b1f5c-2f9f-4ffe-8132-2601143af904')

export default function AQL() {
  const [query, setQuery] = useState(startQuery);
  const [tempQuery, setTempQuery] = useState(startQuery);

  const { isLoading, data, error } = useData(query);

  const [firstItem] = data;
  const fields = useMemo<Array<{ name: string; width: 'flex' }>>(
    () => Object.keys(firstItem || {}).map(name => ({ name, width: 'flex' })),
    [firstItem],
  );

  const renderItem = useCallback(
    ({ item }) => (
      <Row>
        {fields.map((field, idx) => (
          <Field key={idx} {...field}>
            {item[field.name]}
          </Field>
        ))}
      </Row>
    ),
    [fields],
  );

  return (
    <Page title="AQL">
      <View
        style={{
          gap: 8,
          flexGrow: 1,
        }}
      >
        <textarea
          value={tempQuery}
          onChange={e => setTempQuery(e.target.value)}
          style={{
            height: 200,
          }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ButtonWithLoading
            primary
            loading={isLoading}
            onClick={() => setQuery(tempQuery)}
            style={{ width: 100 }}
          >
            Run query
          </ButtonWithLoading>

          {error && <Error>{JSON.stringify(error)}</Error>}
        </View>

        <Table items={data} headers={fields} renderItem={renderItem} />
      </View>
    </Page>
  );
}
