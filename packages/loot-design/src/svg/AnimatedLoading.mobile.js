import React from 'react';
import Loading from './Loading';
import { Animated, Easing } from 'react-native';

class AnimatedLoading extends React.Component {
  constructor() {
    super();
    this.rotation = new Animated.Value(-0.25);
  }

  componentDidMount() {
    this.animate();
  }

  animate() {
    this.rotation.setValue(-0.15);
    Animated.timing(this.rotation, {
      toValue: 1.85,
      duration: 1600,
      easing: Easing.bezier(0.17, 0.67, 0.83, 0.67),
      useNativeDriver: true
    }).start(() => this.animate());
  }

  render() {
    const { color, width, height } = this.props;

    return (
      <Animated.View
        style={{
          flex: 0,
          transform: [
            {
              rotate: this.rotation.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg']
              })
            }
          ]
        }}
      >
        <Loading width={width} height={height} color={color} />
      </Animated.View>
    );
  }
}

export default AnimatedLoading;
