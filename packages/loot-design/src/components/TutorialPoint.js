import React from 'react';

import PropTypes from 'prop-types';

class TutorialPoint extends React.Component {
  static contextTypes = {
    setTutorialNode: PropTypes.func
  };

  ref = el => {
    if (this.context.setTutorialNode) {
      this.context.setTutorialNode(this.props.name, el, this.props.expand);
    }
  };

  render() {
    return <div ref={this.ref} />;
  }
}

export default TutorialPoint;
