import React, { Component } from 'react';

import * as spreadsheet from '../../sheetql/spreadsheet';

class CellDebugger extends Component {
  constructor() {
    super();
    this.state = { expr: '', value: '' };
  }

  componentDidMount() {
    this.unbind = spreadsheet.bind(this.props.name, node => {
      if (this.mode !== 'edit') {
        this.setState({ expr: node.expr, value: node.value });
      }
    });
  }

  componentWillUnmount() {
    this.unbind();
  }

  onChange(e) {
    spreadsheet.set(this.props.name, e.target.value);
    this.setState({ expr: e.target.value });
  }

  onKeyDown(e) {
    if (e.keyCode === 13) {
      this.setState({ mode: 'view' });
      e.target.blur();
    }
  }

  render() {
    return (
      <tr>
        <td>{this.props.name}: </td>
        <td>
          <input
            type="text"
            value={
              this.state.mode === 'edit' ? this.state.expr : this.state.value
            }
            onFocus={() => this.setState({ mode: 'edit' })}
            onBlur={() => this.setState({ mode: 'view' })}
            onChange={this.onChange.bind(this)}
            onKeyDown={this.onKeyDown.bind(this)}
          />
        </td>
      </tr>
    );
  }
}

export default CellDebugger;
