import React from 'react';
import { connect } from 'react-redux';

import PropTypes from 'prop-types';

class Tutorial extends React.Component {
  static childContextTypes = {
    setTutorialNode: PropTypes.func,
    getTutorialNode: PropTypes.func,
    endTutorial: PropTypes.func
  };

  constructor() {
    super();
    this.nodes = {};
  }

  getChildContext() {
    return {
      setTutorialNode: this.setTutorialNode,
      getTutorialNode: this.getTutorialNode
    };
  }

  setTutorialNode = (name, node, expand) => {
    this.nodes[name] = { node, expand };
  };

  getTutorialNode = (name, node) => {
    return this.nodes[name];
  };

  render() {
    const { children } = this.props;
    return React.Children.only(children);
  }
}

export default connect(state => ({ deactivated: state.tutorial.deactivated }))(
  Tutorial
);
