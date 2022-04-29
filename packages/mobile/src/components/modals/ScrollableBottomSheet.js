import React, { Component } from 'react';
import {
  View,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
  Dimensions,
  NativeModules,
  Platform
} from 'react-native';
import BottomSheet from './BottomSheet';
import {
  PanGestureHandler,
  NativeViewGestureHandler
} from 'react-native-gesture-handler';
import AndroidKeyboardAvoidingView from 'loot-design/src/components/mobile/AndroidKeyboardAvoidingView';

class ScrollableBottomSheet extends Component {
  state = { shouldCheckScrollPan: true };

  constructor() {
    super();
    this.scrollHandler = React.createRef();
    this.checkScrollHandler = React.createRef();
    this.scrollWrapperHandler = React.createRef();
    this.positionY = 0;
    this.keyboardHeight = 0;
  }

  componentDidMount() {
    if (Platform.OS === 'ios') {
      const updateInset = e => {
        this.keyboardHeight =
          Dimensions.get('window').height - e.endCoordinates.screenY;
        this.updateInset();
      };

      const listener = Keyboard.addListener(
        'keyboardWillChangeFrame',
        updateInset
      );
      this.cleanup = () => {
        listener.remove();
      };
    } else {
      const onOpen = e => {
        this.keyboardHeight = e.endCoordinates.height;
        this.updateInset();
      };
      const onClose = e => {
        this.keyboardHeight = 0;
        this.updateInset();
      };

      const listener1 = Keyboard.addListener('keyboardDidShow', onOpen);
      const listener2 = Keyboard.addListener('keyboardDidHide', onClose);
      this.cleanup = () => {
        listener1.remove();
        listener2.remove();
      };
    }
  }

  componentWillUnmount() {
    this.cleanup();
  }

  onScrollPan = e => {
    if (e.nativeEvent.y < 0 && this.currentSnapPoint !== 0) {
      this.sheet.move(0);
    }
  };

  onScrollBeginDrag = e => {
    // Turn off the sheet pan handler when the scroll view activates
    if (this.state.shouldCheckScrollPan) {
      this.setState({ shouldCheckScrollPan: false });
    }
    this.notifyScrollStateChanged(e, true);
    this.dragging = true;
  };

  onScrollEndDrag = e => {
    // Turn on the sheet pan handler when the scroll view has stopped
    // moving and if it's at the top. It's important that this is done
    // in this event and not a scroll end event which fires immediately
    // when the user lifts their finger. This fires when the scroll
    // view actually stops moving
    const contentY = e.nativeEvent.contentOffset.y;
    if (contentY <= 0 && !this.state.shouldCheckScrollPan) {
      this.setState({ shouldCheckScrollPan: true });
    }

    if (e.nativeEvent.velocity.y === 0) {
      this.notifyScrollStateChanged(e, false);
    }
    this.dragging = false;
  };

  onScroll = e => {
    // This check is mostly an optimization, we don't need to switch
    // it during a swipe. It also avoids the case where the user it
    // crossing the threshold multiple times during a swipe and we
    // would need to turn off `shouldCheckScrollPan` if they move back
    // down
    if (!this.dragging) {
      const contentY = e.nativeEvent.contentOffset.y;
      if (contentY <= 0 && !this.state.shouldCheckScrollPan) {
        this.setState({ shouldCheckScrollPan: true });
      }
    }
  };

  notifyScrollStateChanged = (args, isScrolling) => {
    const { onScrollStateChanged } = this.props;
    onScrollStateChanged && onScrollStateChanged({ isScrolling, args });
  };

  onMomentumScrollEnd = e => {
    this.notifyScrollStateChanged(e, false);
  };

  open = () => {
    this.sheet.move(0);
  };

  close = cb => {
    this.sheet.close(cb);
  };

  move = snapPoint => {
    this.sheet.move(snapPoint);
  };

  onMove = (snapPoint, positionY) => {
    this.currentSnapPoint = snapPoint;
    this.positionY = positionY;
    this.updateInset();
  };

  updateInset() {
    const inset = this.positionY + this.keyboardHeight;

    if (Platform.OS === 'ios') {
      // this.scrollView.setNativeProps({
      //   contentInset: {
      //     top: 0,
      //     left: 0,
      //     right: 0,
      //     bottom: inset
      //   }
      // });
    } else {
      this.setState({ forcedHeight: inset });
    }
  }

  render() {
    const { shouldCheckScrollPan, forcedHeight } = this.state;
    const {
      renderHeader,
      renderScroll = this.defaultRenderScroll
    } = this.props;

    return (
      <BottomSheet
        ref={el => (this.sheet = el)}
        onMove={this.onMove}
        {...this.props}
      >
        {({ panEvent, onHandlerStateChange }) => {
          return (
            <View style={{ flex: 1 }}>
              {renderHeader && renderHeader()}
              <PanGestureHandler
                ref={this.checkScrollHandler}
                enabled={shouldCheckScrollPan}
                activeOffsetY={20}
                failOffsetY={[-1, 10000]}
                onGestureEvent={panEvent}
                onHandlerStateChange={onHandlerStateChange}
                simultaneousHandlers={this.scrollWrapperHandler}
              >
                <Animated.View style={{ flex: 1 }}>
                  <PanGestureHandler
                    ref={this.scrollWrapperHandler}
                    simultaneousHandlers={[
                      this.scrollHandler,
                      this.checkScrollHandler
                    ]}
                    onGestureEvent={this.onScrollPan}
                  >
                    <View
                      style={
                        forcedHeight
                          ? { flex: 1, paddingBottom: forcedHeight }
                          : { flex: 1 }
                      }
                    >
                      <NativeViewGestureHandler
                        ref={this.scrollHandler}
                        simultaneousHandlers={this.scrollWrapperHandler}
                        {...(shouldCheckScrollPan
                          ? { waitFor: this.checkScrollHandler }
                          : {})}
                      >
                        {renderScroll({
                          ref: el => (this.scrollView = el),
                          automaticallyAdjustContentInsets: false,
                          onScrollBeginDrag: this.onScrollBeginDrag,
                          onScrollEndDrag: this.onScrollEndDrag,
                          onScroll: this.onScroll,
                          onMomentumScrollEnd: this.onMomentumScrollEnd,
                          scrollEventThrottle: 1
                        })}
                      </NativeViewGestureHandler>
                    </View>
                  </PanGestureHandler>
                </Animated.View>
              </PanGestureHandler>
            </View>
          );
        }}
      </BottomSheet>
    );
  }
}

export default ScrollableBottomSheet;
