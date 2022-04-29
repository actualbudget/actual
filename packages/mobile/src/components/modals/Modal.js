import React from 'react';
import { View, Text, Animated, Easing, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FocusAwareStatusBar from 'loot-design/src/components/mobile/FocusAwareStatusBar';
import { colors } from 'loot-design/src/style';
import KeyboardAvoidingView from 'loot-design/src/components/mobile/KeyboardAvoidingView';
import { Button } from 'loot-design/src/components/mobile/common';
import Close from 'loot-design/src/svg/v1/Close';

export function navigateToModal(navigation, name) {
  navigation.navigate({ name, key: 'modal' });
}

export function CloseButton({ navigation }) {
  return (
    <Button
      bare
      onPress={() => {
        // We have to specify this key so the entire modal stack is
        // popped off. Otherwise it would just go back to the last modal.
        navigation.goBack('modal');
      }}
      style={{ padding: 10, marginRight: 5, backgroundColor: 'transparent' }}
    >
      <Close style={{ width: 18, height: 18, color: colors.n1 }} />
    </Button>
  );
}

class Modal extends React.Component {
  opening = new Animated.Value(0);

  componentDidMount() {
    if (this.props.animate) {
      Animated.timing(this.opening, {
        toValue: 1,
        duration: 200,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1.0)
      }).start();
    }
  }

  close() {
    Animated.timing(this.opening, {
      toValue: 0,
      duration: 200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1.0)
    }).start();
  }

  render() {
    let {
      title,
      style,
      children,
      animate,
      backgroundColor,
      rightButton,
      allowScrolling = true,
      edges = ['top', 'bottom']
    } = this.props;
    animate = false;

    return (
      <SafeAreaView
        edges={edges}
        style={{ flex: 1, backgroundColor: 'transparent' }}
      >
        <KeyboardAvoidingView>
          <FocusAwareStatusBar barStyle="light-content" />
          <Animated.View
            style={[
              { flex: 1 },
              animate && {
                opacity: this.opening,
                transform: [
                  {
                    translateY: this.opening.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0]
                    })
                  }
                ]
              }
            ]}
          >
            <View
              style={{
                flex: 1,
                shadowColor: colors.n3,
                shadowOffset: { width: 0, height: 0 },
                shadowRadius: 4,
                shadowOpacity: 1,
                elevation: 2
              }}
            >
              <View
                style={[
                  {
                    margin: 7,
                    borderRadius: 4,
                    overflow: 'hidden',
                    backgroundColor: backgroundColor || colors.n11,
                    flex: 1
                  },
                  style
                ]}
                onLayout={this.onLayout}
                ref={el => (this.modal = el)}
              >
                <View
                  style={{
                    alignSelf: 'stretch',
                    alignItems: 'center',
                    paddingVertical: 15,
                    paddingLeft: 15,
                    backgroundColor: backgroundColor || colors.n11,
                    borderColor: colors.n10,
                    borderBottomWidth: 1
                  }}
                >
                  <Text
                    style={{
                      color: colors.n1,
                      fontSize: 20,
                      fontWeight: '700'
                    }}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  {rightButton && (
                    <View
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        justifyContent: 'center'
                      }}
                    >
                      {rightButton}
                    </View>
                  )}
                </View>
                {allowScrolling ? (
                  <ScrollView style={{ flex: 1 }}>{children}</ScrollView>
                ) : (
                  children
                )}
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }
}

const _Modal = Modal;

export default React.forwardRef(function Modal(props, ref) {
  return (
    <_Modal
      {...props}
      onRef={modal => {
        // TODO: This is a hacky bugfix. We need to expose the internal
        // `close` function and for some reason the HOC keeps being
        // exposed instead. In the future, we should use render props
        // or hooks and avoid all of this entirely
        if (modal && modal.close && typeof ref === 'function') {
          ref(modal);
        }
      }}
    />
  );
});
