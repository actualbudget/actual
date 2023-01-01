import React from 'react';

import CodeMirror from 'codemirror';

import * as spreadsheet from 'loot-core/src/client/sheetql/spreadsheet';
import {
  send,
  init as initConnection
} from 'loot-core/src/platform/client/fetch';
import {
  View,
  Button,
  Input,
  InlineField
} from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

require('codemirror/lib/codemirror.css');
require('codemirror/theme/monokai.css');

class Debugger extends React.Component {
  state = {
    recording: false,
    selecting: false,
    name: '__global!tmp',
    collapsed: true,
    node: null
  };

  toggleRecord = () => {
    if (this.state.recording) {
      window.__stopProfile();
      this.setState({ recording: false });
    } else {
      window.__startProfile();
      this.setState({ recording: true });
    }
  };

  reloadBackend = async () => {
    window.Actual.reloadBackend();
    initConnection(await global.Actual.getServerSocket());
  };

  init() {
    this.mirror = CodeMirror(this.node, {
      theme: 'monokai'
    });

    this.mirror.setSize('100%', '100%');

    // this.mirror.on('change', () => {
    //   const val = this.mirror.getValue();
    //   const [sheetName, name] = this.state.name.split('!');

    //   spreadsheet.set(sheetName, name, this.mirror.getValue());
    // });

    const mouseoverHandler = e => {
      let node = e.target;
      let cellname = null;

      while (!cellname && node) {
        cellname = node.dataset && node.dataset.cellname;
        node = node.parentNode;
      }

      if (this.state.selecting && cellname) {
        this.bind(cellname);
      }
    };
    document.body.addEventListener('mouseover', mouseoverHandler, false);

    const clickHandler = e => {
      if (this.state.selecting) {
        this.setState({ selecting: false });
      }
    };
    document.body.addEventListener('click', clickHandler, false);

    this.removeListeners = () => {
      document.body.removeEventListener('mouseover', mouseoverHandler);
      document.body.removeEventListener('click', clickHandler);
    };

    this.bind(this.state.name);
  }

  deinit() {
    if (this.unbind) {
      this.unbind();
    }

    this.removeListeners();
    this.mirror = null;
  }

  bind(resolvedName) {
    if (this.unbind) {
      this.unbind();
    }
    const [sheetName, name] = resolvedName.split('!');
    let currentReq = Math.random();
    this.currentReq = currentReq;

    send('debugCell', { sheetName, name }).then(node => {
      if (currentReq === this.currentReq) {
        if (node._run) {
          this.mirror.setValue(node._run);
        }
        this.setState({ name: node.name, node });

        this.unbind = spreadsheet.bind(sheetName, { name }, null, node => {
          if (currentReq !== this.currentReq) {
            return;
          }

          this.setState({ node: { ...this.state.node, value: node.value } });

          this.valueNode.style.transition = 'none';
          this.valueNode.style.backgroundColor = colors.y9;
          setTimeout(() => {
            this.valueNode.style.transition = 'background-color .8s';
            this.valueNode.style.backgroundColor = 'rgba(0, 0, 0, 0)';
          }, 50);
        });
      }
    });
  }

  componentWillUnmount() {
    if (this.unbind) {
      this.unbind();
      this.unbind = null;
    }
  }

  onShow = () => {
    this.setState({ collapsed: false }, () => {
      this.init();
    });
  };

  onClose = () => {
    this.setState({ collapsed: true }, () => {
      this.deinit();
    });
  };

  onSelect = () => {
    this.setState({ selecting: true });
  };

  onNameChange = e => {
    const name = e.target.value;
    this.bind(name);
    this.setState({ name });
  };

  unselect() {
    if (this.unbind) {
      this.unbind();
      this.unbind = null;
      this.setState({ sheetName: null, name: null, node: null });
    }
  }

  render() {
    const { children } = this.props;
    const { name, node, selecting, collapsed, recording } = this.state;

    return (
      <View
        style={{
          height: '100%',
          '& .CodeMirror': { border: '1px solid ' + colors.b4 }
        }}
      >
        <div style={{ flex: 1, overflow: 'hidden' }}>{children}</div>
        <View
          className="debugger"
          style={[
            {
              position: 'fixed',
              right: 0,
              bottom: 0,
              margin: 15,
              padding: 10,
              backgroundColor: 'rgba(50, 50, 50, .85)',
              color: 'white',
              zIndex: 1000,
              flexDirection: 'row',
              alignItems: 'center'
            },
            !collapsed && {
              width: 700,
              height: 200
            }
          ]}
        >
          {collapsed ? (
            <React.Fragment>
              <div
                className="activity"
                style={{
                  width: 10,
                  height: 10,
                  backgroundColor: '#303030',
                  marginRight: 10,
                  borderRadius: 10
                }}
              />
              <Button onClick={this.toggleRecord} style={{ marginRight: 10 }}>
                {recording ? 'Stop' : 'Start'} Profile
              </Button>
              <Button onClick={this.reloadBackend} style={{ marginRight: 10 }}>
                Reload backend
              </Button>
              <Button onClick={this.onShow}>^</Button>
            </React.Fragment>
          ) : (
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-start',
                  marginBottom: 5,
                  flexShrink: 0
                }}
              >
                <Button
                  style={{
                    backgroundColor: '#303030',
                    color: 'white',
                    padding: '2px 5px',
                    marginRight: 5
                  }}
                  onClick={this.onClose}
                >
                  v
                </Button>
                <Button
                  style={[
                    {
                      backgroundColor: '#303030',
                      color: 'white',
                      padding: '2px 5px'
                    },
                    selecting && {
                      backgroundColor: colors.p7
                    }
                  ]}
                  onClick={this.onSelect}
                >
                  Inspect Cell
                </Button>
              </View>
              <InlineField label="Name" style={{ flex: '0 0 auto' }}>
                <Input
                  value={name}
                  onChange={this.onNameChange}
                  style={{
                    backgroundColor: '#303030',
                    color: 'white',
                    flex: 1
                  }}
                />
              </InlineField>
              <InlineField
                label="Expr"
                style={{ flex: 1, alignItems: 'stretch', overflow: 'hidden' }}
              >
                <div
                  style={{ flex: 1, overflow: 'hidden' }}
                  ref={n => (this.node = n)}
                />
              </InlineField>
              <InlineField
                label="Dependencies"
                labelWidth={100}
                style={{ flex: '0 0 auto' }}
              >
                <pre
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0)',
                    height: 30,
                    overflow: 'scroll'
                  }}
                >
                  {node && JSON.stringify(node._dependencies, null, 2)}
                </pre>
              </InlineField>
              <InlineField label="Value" style={{ flex: '0 0 auto' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0)',
                    transition: 'background-color .5s',
                    height: 30,
                    overflow: 'scroll'
                  }}
                  ref={n => (this.valueNode = n)}
                >
                  {node && JSON.stringify(node.value)}
                </div>
              </InlineField>
            </View>
          )}
        </View>
      </View>
    );
  }
}

export default Debugger;
