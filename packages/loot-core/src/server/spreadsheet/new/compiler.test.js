import { compile } from './compiler';

describe('Compiler', () => {
  test('get-query', () => {
    compile(
      '=from transactions where acct.offbudget = 0 and category = null and (description.transfer_acct.offbudget = 1 or description.transfer_acct = null) calculate { count(date) }',
    );
  });

  test('basic', () => {
    let ops = compile(`
    =first(number(from transactions
       where
         date >= 20170101 and
         date <= 20170131 and
         acct.bank.name = 1
       calculate { sum(amount) }))
  `).ops;
    expect(ops).toMatchSnapshot();

    ops = compile('').ops;
    expect(ops).toMatchSnapshot();
  });

  test('parens', () => {
    let ops = compile('=(1 + 2)').ops;
    expect(ops).toMatchSnapshot();

    ops = compile('=(1232 + 2) - (3 + 4)').ops;
    expect(ops).toMatchSnapshot();
  });

  test('compiler binary ops', () => {
    let ops = compile('=foo + bar + baz + boo').ops;
    expect(ops).toMatchSnapshot();
  });

  test('compiler nested funcs', () => {
    let ops = compile('=min(0, number(-20000))').ops;
    expect(ops).toMatchSnapshot();
  });

  test('compiles boolean types', () => {
    let ops = compile('=if(true and 1) { 0 } else { 1 } ').ops;
    expect(ops).toMatchSnapshot();
  });

  test('query expressions', () => {
    let ops = compile(`
      =from transactions
         where amount > 0
         select { sum(amount) as a }
    `).ops;
    expect(ops).toMatchSnapshot();
  });

  test('query expressions with null', () => {
    let ops = compile(`
  =from transactions where acct.offbudget = 0 and category = null calculate { count(amount) }
    `).ops;
    expect(ops).toMatchSnapshot();
  });

  test('complex query expressions', () => {
    let ops = compile(`
      =from transactions groupby substr(date, 0, 7) select { substr(date, 0, 7), sum(amount) }
    `).ops;
    expect(ops).toMatchSnapshot();
  });

  test('query expressions with field remapping', () => {
    let ops = compile(`
      =from transactions where category = "50" select { id }
    `).ops;
    expect(ops).toMatchSnapshot();

    ops = compile(`
      =from transactions where category.name = "foo" select { id }
    `).ops;
    expect(ops).toMatchSnapshot();

    ops = compile(`
      =from transactions where category = "50" select { id, category.name }
    `).ops;
    expect(ops).toMatchSnapshot();
  });

  test('field dependencies', () => {
    let sqlDependencies = compile(
      '=from transactions where acct.offbudget = 0 and category = null and (description.transfer_acct.offbudget = 1 or description.transfer_acct = null) calculate { count(date) }',
    ).sqlDependencies;

    expect(sqlDependencies[0].fields).toMatchSnapshot();
  });
});
