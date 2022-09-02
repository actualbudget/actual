import React from 'react';
import {
  View,
  Text,
  Animated,
  ScrollView,
  Keyboard,
  StyleSheet
} from 'react-native';
import { RectButton } from 'react-native-gesture-handler';

import mitt from 'mitt';

import {
  toRelaxedNumber,
  amountToCurrency,
  getNumberFormat
} from 'loot-core/src/shared/util';
import Platform from 'loot-core/src/client/platform';

import { colors } from '../../style';
import { KeyboardButton } from './common';
import TextInputWithAccessory from './TextInputWithAccessory';
import MathIcon from '../../svg/Math';
import Add from '../../svg/v1/Add';
import Subtract from '../../svg/v1/Subtract';
import Equals from '../../svg/v1/Equals';

function getValue(state) {
  const { value, isNegative } = state;
  return isNegative ? -value : value;
}

// On Android, the keyboard accessory view may not have been mounted
// yet. Unfortunately, that means we need to track the "reset" event
// so when it mounts it can read it.
let _lastResetEvent = null;

export class MathOperations extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showMath: false,
      currentOp: null,
      isNegative: _lastResetEvent ? _lastResetEvent.isNegative : false
    };
  }

  componentDidMount() {
    Keyboard.addListener('keyboardDidHide', e => {
      this.setState({ showMath: false, currentOp: null });
    });

    const clearOperation = () => this.setState({ currentOp: null });
    const reset = ({ isNegative }) => {
      this.setState({ isNegative, currentOp: null });
    };

    this.props.emitter.on('clear-operation', clearOperation);
    this.props.emitter.on('set-negative', this.setNegative);
    this.props.emitter.on('reset', reset);
    this.cleanup = () => {
      this.props.emitter.off('clear-operation', clearOperation);
      this.props.emitter.off('set-negative', this.setNegative);
      this.props.emitter.off('reset', reset);
    };
  }

  componentWillUnmount() {
    this.cleanup();
  }

  setNegative = flag => {
    this.setState({ isNegative: flag });
    this.props.emitter.emit('negative-changed', flag);
  };

  onShowMath = () => {
    this.setState({ showMath: true });
  };

  onStartMath = op => {
    this.setState({ currentOp: op });
    this.props.emitter.emit('start-math', op);
  };

  onToggleNegative = () => {
    this.setNegative(!this.state.isNegative);
  };

  render() {
    const { showMath, currentOp, isNegative } = this.state;

    return (
      <View style={{ flexDirection: 'row' }}>
        {showMath ? (
          <View
            style={{ flexDirection: 'row', alignItems: 'stretch', width: 150 }}
          >
            <KeyboardButton
              onPress={() => this.setState({ showMath: false })}
              style={{ marginRight: 5, flexGrow: 0, paddingHorizontal: 7 }}
            >
              <MathIcon width={15} height={15} />
            </KeyboardButton>
            <KeyboardButton
              onPress={() => this.onStartMath('+')}
              highlighted={currentOp === '+'}
              style={{ marginRight: 5, flex: 1, paddingHorizontal: 0 }}
              data-testid="add"
            >
              <Add
                key={currentOp === '+' ? 'yes' : 'no'}
                width={13}
                height={13}
                style={{ color: currentOp === '+' ? 'white' : colors.n1 }}
              />
            </KeyboardButton>
            <KeyboardButton
              onPress={() => this.onStartMath('-')}
              highlighted={currentOp === '-'}
              style={{ marginRight: 5, flex: 1, paddingHorizontal: 0 }}
              data-testid="subtract"
            >
              <Subtract
                key={currentOp === '-' ? 'yes' : 'no'}
                width={10}
                height={10}
                style={{ color: currentOp === '-' ? 'white' : colors.n1 }}
              />
            </KeyboardButton>
            <KeyboardButton
              onPress={() => this.onStartMath(null)}
              style={{ flex: 1, paddingHorizontal: 0 }}
              data-testid="equal"
            >
              <Equals width={13} height={13} />
            </KeyboardButton>
          </View>
        ) : (
          <React.Fragment>
            <KeyboardButton
              style={{ marginRight: 5, paddingHorizontal: 13 }}
              highlighted={isNegative}
              onPress={() => this.onToggleNegative()}
              data-testid="negative"
            >
              <Subtract
                /* react-native-svg does not properly rerender, so force it to */
                key={isNegative ? 'yes' : 'no'}
                width={10}
                height={10}
                style={{ color: isNegative ? 'white' : colors.n1 }}
              />
            </KeyboardButton>
            <KeyboardButton onPress={this.onShowMath} data-testid="math">
              <MathIcon width={17} height={17} />
            </KeyboardButton>
          </React.Fragment>
        )}
      </View>
    );
  }
}

export const AmountAccessoryContext = React.createContext(mitt());

export function AmountAccessoryView() {
  return (
    <AmountAccessoryContext.Consumer>
      {context => (
        <View
          style={{
            backgroundColor: colors.n10,
            padding: 5,
            height: 45,
            flexDirection: 'row',
            justifyContent: 'flex-end',

            shadowColor: colors.n7,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 1,
            shadowOpacity: 1
          }}
        >
          <MathOperations emitter={context} />
          <View style={{ flex: 1 }} />
          <KeyboardButton
            onPress={() => context.emit('done')}
            data-testid="done"
          >
            Done
          </KeyboardButton>
        </View>
      )}
    </AmountAccessoryContext.Consumer>
  );
}

class AmountInput extends React.Component {
  static getDerivedStateFromProps(props, state) {
    return { editing: state.text !== '' || state.editing };
  }

  constructor(props) {
    super(props);
    this.backgroundValue = new Animated.Value(0);

    this.id = Math.random()
      .toString()
      .slice(0, 5);
    this.state = {
      editing: false,
      text: '',
      // These are actually set from the props when the field is
      // focused
      value: 0,
      isNegative: false
    };
  }

  componentDidMount() {
    if (this.props.focused) {
      this.focus();
    }
  }

  componentWillUnmount() {
    if (this.removeListeners) {
      this.removeListeners();
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (!prevProps.focused && this.props.focused) {
      this.focus();
    } else if (prevProps.focused && !this.props.focused) {
      if (this.animating) {
        this.animating = false;
        this.animation.stop();
        this.backgroundValue.setValue(0);
      }
    }

    if (prevProps.value !== this.props.value) {
      this.setState({
        editing: false,
        text: '',
        ...this.getInitialValue()
      });
    }
  }

  parseText() {
    return toRelaxedNumber(
      this.state.text.replace(/[,.]/, getNumberFormat().separator)
    );
  }

  animate() {
    this.animation = Animated.sequence([
      Animated.timing(this.backgroundValue, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true
      }),
      Animated.timing(this.backgroundValue, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true
      })
    ]);

    this.animation.start(({ finished }) => {
      if (finished) {
        this.animate();
      }
    });
  }

  onKeyPress = e => {
    if (e.nativeEvent.key === 'Backspace' && this.state.text === '') {
      this.setState({ editing: true });
    }
  };

  getInitialValue() {
    // We set the initial value here because it could have changed
    // from props or something
    let isNegative;
    if (this.props.zeroIsNegative) {
      isNegative = this.props.value <= 0;
    } else {
      isNegative = this.props.value < 0;
    }

    return {
      value: Math.abs(this.props.value),
      isNegative
    };
  }

  focus() {
    this.input.focus();

    if (!this.animating) {
      this.animating = true;
      this.animate();
    }

    const initialState = this.getInitialValue();
    this.setState(initialState);

    this.addEventListeners();

    if (Platform.OS === 'android') {
      // On Android, the keyboard accessory view might not be mounted
      // yet, so we keep track of the last reset event
      _lastResetEvent = { isNegative: initialState.isNegative };
      this.props.context.emit('reset', _lastResetEvent);
    } else {
      this.props.context.emit('reset', { isNegative: initialState.isNegative });
    }
  }

  addEventListeners() {
    if (this.removeListeners) {
      this.removeListeners();
    }

    this.props.context.on('start-math', this.onStartMath);
    this.props.context.on('negative-changed', this.onSetNegative);
    // This will be called in `onBlur`
    this.removeListeners = () => {
      this.props.context.off('start-math', this.onStartMath);
      this.props.context.off('negative-changed', this.onSetNegative);
      this.removeListeners = null;
    };
  }

  onSetNegative = flag => {
    this.setState({ isNegative: flag });
  };

  onStartMath = op => {
    this.applyText();
    this.setState({ currentMathOp: op });
  };

  applyText = () => {
    const { currentMathOp, editing, isNegative } = this.state;
    let newValue;

    switch (currentMathOp) {
      case '+':
        newValue = getValue(this.state) + this.parseText();
        break;
      case '-':
        newValue = getValue(this.state) - this.parseText();
        break;
      default: {
        const parsed = this.parseText();
        newValue = editing
          ? isNegative
            ? -parsed
            : parsed
          : getValue(this.state);
      }
    }

    this.setState({
      value: Math.abs(newValue),
      isNegative: newValue < 0,
      editing: false,
      text: '',
      currentMathOp: null
    });

    return newValue;
  };

  onBlur = () => {
    const value = this.applyText();
    this.props.onBlur && this.props.onBlur(value);
    if (this.removeListeners) {
      this.removeListeners();
    }
  };

  renderNegative = () => {
    if (this.state.isNegative) {
      return '-';
    }
    return '';
  };

  renderMathOp = () => {
    switch (this.state.currentMathOp) {
      case '+':
        return '+';
      case '-':
        return '-';
      default:
        if (this.state.isNegative) {
          return '-';
        }
    }

    return '';
  };

  onChangeText = text => {
    let { currentMathOp, isNegative } = this.state;
    let { onChange } = this.props;

    this.setState({ text });

    // We only want to notify anyone listening if we currently aren't
    // doing math. Otherwise they'd just the math value that is being
    // entered. Also, we need to manually apply the negative. This is
    // important if a user is saving this value instead of getting it
    // on blur
    if (currentMathOp == null && onChange) {
      onChange(isNegative ? '-' + text : text);
    }
  };

  render() {
    const { style, textStyle, scrollIntoView, animationColor } = this.props;
    const { editing, value, text } = this.state;

    let input = (
      <TextInputWithAccessory
        ref={el => (this.input = el)}
        value={text}
        accessoryId={this.props.inputAccessoryViewID || 'amount'}
        keyboardType={Platform.isReactNativeWeb ? null : 'numeric'}
        selectTextOnFocus={false}
        autoCapitalize="none"
        onChangeText={this.onChangeText}
        onBlur={this.onBlur}
        // Normally, focus is controlled outside of this component
        // this is a "hidden" input and the user can't directly tap
        // it. On blur, it removes event listeners. But let's make
        // this work in case the input gets focused again by adding
        // back the listeners (this is necessary for the web target)
        onFocus={() => this.addEventListeners()}
        onKeyPress={this.onKeyPress}
        data-testid="amount-input"
        style={{ flex: 1, textAlign: 'center' }}
      />
    );

    return (
      <View
        style={[
          {
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.p3,
            borderRadius: 4,
            padding: 5,
            backgroundColor: 'white'
          },
          style
        ]}
      >
        {scrollIntoView ? (
          <View
            style={[styles.inputContainer, styles.inputContent]}
            pointerEvents="box-none"
          >
            {input}
          </View>
        ) : (
          <ScrollView
            style={styles.inputContainer}
            contentContainerStyle={styles.inputContent}
            pointerEvents="box-none"
          >
            {input}
          </ScrollView>
        )}

        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,

            backgroundColor: animationColor || colors.p10,
            opacity: this.backgroundValue,
            borderRadius: 2
          }}
          pointerEvents="none"
        />
        <Text
          style={textStyle}
          data-testid="amount-fake-input"
          pointerEvents="none"
        >
          {editing
            ? this.renderMathOp() + text
            : this.renderNegative() + amountToCurrency(value)}
        </Text>
      </View>
    );
  }
}

export default function AmountInputWithContext(props) {
  return (
    <AmountAccessoryContext.Consumer>
      {context => <AmountInput {...props} context={context} />}
    </AmountAccessoryContext.Consumer>
  );
}

class FocusableAmountInput_ extends React.Component {
  state = { focused: false };

  componentDidMount() {
    const onDone = () => {
      this.setState({ focused: false });
      Keyboard.dismiss();
    };
    this.props.context.on('done', onDone);
    this.cleanup = () => {
      this.props.context.off('done', onDone);
    };
  }

  componentWillUnmount() {
    this.cleanup();
  }

  focus = () => {
    this.setState({ focused: true }, () => {
      const { sign, value } = this.props;

      // Only force a signage if the value is 0 (the default on new
      // transactions)
      let isNegative =
        value !== 0
          ? undefined
          : sign === 'positive'
          ? false
          : sign === 'negative'
          ? true
          : undefined;

      if (isNegative !== undefined) {
        this.props.context.emit('set-negative', isNegative);
      }
    });
  };

  onFocus = () => {
    this.focus();
  };

  onBlur = value => {
    this.setState({ focused: false, reallyFocused: false });
    if (this.props.onBlur) {
      this.props.onBlur(value);
    }
  };

  render() {
    const { textStyle, style, focusedStyle, buttonProps } = this.props;
    const { focused } = this.state;

    return (
      <View testID="scroll-to-boundary">
        <AmountInputWithContext
          {...this.props}
          ref={el => (this.amount = el)}
          onBlur={this.onBlur}
          focused={focused}
          style={[
            {
              width: 80,
              transform: [{ translateX: 6 }],
              justifyContent: 'center'
            },
            style,
            focusedStyle,
            !focused && {
              opacity: 0,
              position: 'absolute',
              top: 0
            }
          ]}
          textStyle={[{ fontSize: 15, textAlign: 'right' }, textStyle]}
        />

        <RectButton
          onPress={this.onFocus}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          {...buttonProps}
          style={[
            buttonProps && buttonProps.style,
            focused && { display: 'none' }
          ]}
        >
          <View
            style={[
              {
                borderBottomWidth: 1,
                borderColor: '#e0e0e0',
                justifyContent: 'center',
                transform: [{ translateY: 0.5 }]
              },
              style
            ]}
          >
            <Text style={[{ fontSize: 15 }, textStyle]}>
              {amountToCurrency(this.props.value)}
            </Text>
          </View>
        </RectButton>
      </View>
    );
  }
}

export const FocusableAmountInput = React.forwardRef((props, ref) => {
  return (
    <AmountAccessoryContext.Consumer>
      {context => (
        // eslint-disable-next-line
        <FocusableAmountInput_ ref={ref} {...props} context={context} />
      )}
    </AmountAccessoryContext.Consumer>
  );
});

let styles = StyleSheet.create({
  inputContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    opacity: 0
  },
  inputContent: {
    flexDirection: 'row',
    alignItems: 'stretch'
  }
});
