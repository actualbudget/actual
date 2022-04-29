import React from 'react';

class ExitTransition extends React.Component {
  state = { dead: true, savedProps: null };

  static getDerivedStateFromProps(props, state) {
    return {
      exiting: !props.alive,
      dead: !props.alive && state.dead,
      savedProps: props.alive ? props.withProps : state.savedProps
    };
  }

  onDone = () => {
    this.setState({ dead: true });
  };

  render() {
    const { children } = this.props;
    const { exiting, dead, savedProps } = this.state;

    if (dead) {
      return null;
    }
    return children(exiting, this.onDone, savedProps);
  }
}

export default ExitTransition;
