import React from 'react';

import styled from 'styled-components';

import { send } from 'loot-core/src/platform/client/fetch';

const Container = styled.div`
  width: 100%;
  overflow: auto;
`;

const Code = styled.textarea`
  width: 100%;
  height: 10em;
  font-size: 1em;
`;

const Output = styled.pre`
  width: 100%;
  background-color: #333333;
  color: white;
  padding: 0.5em;
`;

class Debug extends React.Component {
  constructor() {
    super();
    this.state = {
      value: localStorage.debugValue,
      outputType: 'ast',
      ast: null,
      code: null,
      sql: null,
      sqlgenValue: localStorage.sqlgenValue,
      sqlgenRow: localStorage.sqlgenRow
    };
  }

  componentDidMount() {
    this.fetchResults(this.state.value);
    this.fetchSqlGenResult(this.state.value);
  }

  fetchResults(value) {
    localStorage.debugValue = value;

    send('debug-ast', { code: value }).then(ast => {
      this.setState({ ast });
    });
    send('debug-code', { code: value }).then(code => {
      this.setState({ code });
    });
    send('debug-query', { code: value }).then(sql => {
      this.setState({ sql });
    });
  }

  async fetchSqlGenResult() {
    let row = {}; // eslint-disable-line
    try {
      row = (0, eval)('(' + this.state.sqlgenRow + ')'); // eslint-disable-line
    } catch (e) {}

    const res = await send('debug-sqlgen', {
      expr: this.state.sqlgenValue
    });
    this.setState({ sqlgenResult: res });
  }

  processInput(e) {
    this.setState({ value: e.target.value });
    this.fetchResults(e.target.value);
  }

  processSqlGen(value, field) {
    localStorage[field] = value;
    this.setState({ [field]: value }, () => {
      this.fetchSqlGenResult();
    });
  }

  onInputType(e) {
    this.setState({ outputType: e.target.value });
  }

  render() {
    const {
      // value,
      // outputType,
      // ast,
      // code,
      // sql,
      sqlgenValue,
      sqlgenRow,
      sqlgenResult
    } = this.state;

    return (
      <Container>
        {/*<h2>Debug</h2>
        <p>Input:</p>
        <Code value={value} onChange={this.processInput.bind(this)} />
        <select
          value={this.state.outputType}
          onChange={this.onInputType.bind(this)}
        >
          <option value="ast">AST</option>
          <option value="code">code</option>
          <option value="sql">SQL</option>
        </select>

        <div style={{ display: outputType === 'ast' ? 'block' : 'none' }}>
          <p>AST:</p>
          <Output>{ast ? JSON.stringify(ast, null, 2) : ''}</Output>
        </div>

        <div style={{ display: outputType === 'code' ? 'block' : 'none' }}>
          <p>Code:</p>
          <Output>{code || ''}</Output>
        </div>

        <div style={{ display: outputType === 'sql' ? 'block' : 'none' }}>
          <p>SQL:</p>
          <Output>{sql || ''}</Output>
        </div>*/}

        <h3>sqlgen</h3>
        <Code
          value={sqlgenValue}
          onChange={e => this.processSqlGen(e.target.value, 'sqlgenValue')}
        />
        <Code
          value={sqlgenRow}
          onChange={e => this.processSqlGen(e.target.value, 'sqlgenRow')}
        />
        <Output>{JSON.stringify(sqlgenResult)}</Output>
      </Container>
    );
  }
}

export default Debug;
