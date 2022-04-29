import React, { Component } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import AndroidKeyboardAvoidingView from 'loot-design/src/components/mobile/AndroidKeyboardAvoidingView';

const windowHeight = Dimensions.get('window').height;

class BottomSheet extends Component {
  constructor() {
    super();

    this.drawerHandler = React.createRef();

    this.panY = new Animated.Value(0);
    this.panEvent = Animated.event(
      [{ nativeEvent: { translationY: this.panY } }],
      { useNativeDriver: true }
    );
    this.positionY = new Animated.Value(0);
    this.translateY = Animated.add(this.panY, this.positionY);
    this.opacity = new Animated.Value(1);
  }

  componentDidMount() {
    const { allowFullscreen = true, snapPoints = [] } = this.props;

    this.snapPoints = [
      // Invert the points so they are relative to the top
      ...snapPoints.map(y => windowHeight - y),
      // Always allow it to be fully closed
      windowHeight
    ];

    if (allowFullscreen) {
      // Allow it to be fully opened
      this.snapPoints.unshift(30);
    }

    // Initial state should be closed
    this.positionY.setValue(this.snapPoints[this.snapPoints.length - 1]);
    this.move(this.snapPoints.length > 2 ? 1 : 0);
  }

  componentDidUpdate(prevProps) {
    // If the sheet is opened again before we've finished closing,
    // open the same instance up
    if (prevProps.state !== 'open' && this.props.state === 'open') {
      this.move(this.snapPoints.length > 2 ? 1 : 0);
    }
  }

  onHandlerStateChange = e => {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      const y = Math.max(
        this.snapPoints[this.currentSnapPoint] + e.nativeEvent.translationY,
        0
      );
      this.panY.setValue(0);
      this.positionY.setValue(y);

      if (e.nativeEvent.velocityY > 100) {
        this.close();
      } else {
        let finalSnapPoint = this.currentSnapPoint;

        // Open it up more if it moves up enough
        if (
          this.currentSnapPoint > 0 &&
          y < this.snapPoints[this.currentSnapPoint] - 50
        ) {
          finalSnapPoint = this.currentSnapPoint - 1;
        }

        // Close it if moved down enough
        if (y > this.snapPoints[this.currentSnapPoint] + 75) {
          finalSnapPoint = this.snapPoints.length - 1;
        }

        this.move(finalSnapPoint);
      }
    }
  };

  move = (snapPoint, cb) => {
    const { onChangeState, onMove } = this.props;
    this.currentSnapPoint = snapPoint;
    const closing = this.currentSnapPoint === this.snapPoints.length - 1;

    Animated.spring(this.positionY, {
      tension: 50,
      toValue: this.snapPoints[snapPoint],
      useNativeDriver: true
    }).start(() => {
      if (this.currentSnapPoint === snapPoint) {
        if (onMove) {
          onMove(snapPoint, this.snapPoints[snapPoint]);
        }
      }
    });

    if (closing) {
      onChangeState && onChangeState('closing');
      Animated.timing(this.opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true
      }).start(() => {
        onChangeState && onChangeState('closed');
      });
    }
  };

  close = cb => {
    this.move(this.snapPoints.length - 1, cb);
  };

  render() {
    const { children, flush } = this.props;

    return (
      <View style={styles.container} ref={el => (this.container = el)}>
        <PanGestureHandler
          ref={this.drawerHandler}
          onGestureEvent={this.panEvent}
          onHandlerStateChange={this.onHandlerStateChange}
        >
          <Animated.View style={{ flex: 1 }}>
            <Animated.View
              style={[
                styles.darkened,
                {
                  backgroundColor: 'rgba(0, 0, 0, 1.0)',
                  opacity: this.translateY.interpolate({
                    inputRange: [0, windowHeight],
                    outputRange: [0.5, 0]
                  })
                }
              ]}
            />

            <Animated.View
              style={{
                flex: 1,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                backgroundColor: '#f0f0f0',
                opacity: this.opacity,
                transform: [
                  {
                    translateY: this.translateY.interpolate({
                      inputRange: [0, windowHeight],
                      outputRange: [0, windowHeight],
                      extrapolate: 'clamp'
                    })
                  }
                ]
              }}
            >
              <View style={[styles.content, !flush && { paddingTop: 15 }]}>
                {typeof children === 'function'
                  ? children({
                      panEvent: this.panEvent,
                      onHandlerStateChange: this.onHandlerStateChange
                    })
                  : children}
              </View>
              <View style={styles.header}>
                <View style={styles.closeHandle} />
              </View>
            </Animated.View>
          </Animated.View>
        </PanGestureHandler>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  sheet: { flex: 1 },
  closeHandle: {
    width: 28,
    height: 5,
    backgroundColor: 'rgba(0, 0, 0, .2)',
    alignSelf: 'center',
    borderRadius: 5,
    transform: [{ translateY: 10 }]
  },
  darkened: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0
  },
  content: {
    flex: 1
  }
});

export default BottomSheet;
