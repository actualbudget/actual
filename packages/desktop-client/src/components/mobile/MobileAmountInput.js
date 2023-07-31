import { PureComponent } from 'react';

import {
  toRelaxedNumber,
  amountToCurrency,
  getNumberFormat,
} from 'loot-core/src/shared/util';

import { colors } from '../../style';
import Button from '../common/Button';
import Text from '../common/Text';
import View from '../common/View';

function getValue(state) {
  const { value } = state;
  return value;
}

class AmountInput extends PureComponent {
  static getDerivedStateFromProps(props, state) {
    return { editing: state.text !== '' || state.editing };
  }

  constructor(props) {
    super(props);
    // this.backgroundValue = new Animated.Value(0);
    this.backgroundValue = 0;

    this.id = Math.random().toString().slice(0, 5);
    this.state = {
      editing: false,
      text: '',
      // These are actually set from the props when the field is
      // focused
      value: 0,
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
    }

    if (prevProps.value !== this.props.value) {
      this.setState({
        editing: false,
        text: '',
        ...this.getInitialValue(),
      });
    }
  }

  parseText() {
    return toRelaxedNumber(
      this.state.text.replace(/[,.]/, getNumberFormat().separator),
    );
  }

  // animate() {
  //   this.animation = Animated.sequence([
  //     Animated.timing(this.backgroundValue, {
  //       toValue: 1,
  //       duration: 1200,
  //       useNativeDriver: true,
  //     }),
  //     Animated.timing(this.backgroundValue, {
  //       toValue: 0,
  //       duration: 1200,
  //       useNativeDriver: true,
  //     }),
  //   ]);

  //   this.animation.start(({ finished }) => {
  //     if (finished) {
  //       this.animate();
  //     }
  //   });
  // }

  onKeyPress = e => {
    if (e.nativeEvent.key === 'Backspace' && this.state.text === '') {
      this.setState({ editing: true });
    }
  };

  getInitialValue() {
    return {
      value: Math.abs(this.props.value),
    };
  }

  focus() {
    this.input.focus();

    const initialState = this.getInitialValue();
    this.setState(initialState);
  }

  applyText = () => {
    const { editing } = this.state;

    const parsed = this.parseText();
    const newValue = editing ? parsed : getValue(this.state);

    this.setState({
      value: Math.abs(newValue),
      editing: false,
      text: '',
    });

    return newValue;
  };

  onBlur = () => {
    const value = this.applyText();
    this.props.onBlur?.(value);
    if (this.removeListeners) {
      this.removeListeners();
    }
  };

  onChangeText = text => {
    let { onChange } = this.props;

    this.setState({ text });
    onChange(text);
  };

  render() {
    const { style, textStyle } = this.props;
    const { editing, value, text } = this.state;

    let input = (
      <input
        type="text"
        ref={el => (this.input = el)}
        value={text}
        inputMode="decimal"
        autoCapitalize="none"
        onChange={e => this.onChangeText(e.target.value)}
        onBlur={this.onBlur}
        onKeyPress={this.onKeyPress}
        data-testid="amount-input"
        style={{ flex: 1, textAlign: 'center', position: 'absolute' }}
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
            backgroundColor: 'white',
          },
          style,
        ]}
      >
        <View style={{ overflowY: 'auto' }}>{input}</View>

        {/* <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,

            backgroundColor: animationColor || colors.p10,
            opacity: this.backgroundValue,
            borderRadius: 2,
          }}
          pointerEvents="none"
        /> */}
        <Text
          style={textStyle}
          data-testid="amount-fake-input"
          pointerEvents="none"
        >
          {editing ? text : amountToCurrency(value)}
        </Text>
      </View>
    );
  }
}

export class FocusableAmountInput extends PureComponent {
  state = { focused: false, isNegative: true };

  componentDidMount() {
    if (this.props.sign) {
      this.setState({ isNegative: this.props.sign === 'negative' });
    } else if (
      this.props.value > 0 ||
      (!this.props.zeroIsNegative && this.props.value === 0)
    ) {
      this.setState({ isNegative: false });
    }
  }

  focus = () => {
    this.setState({ focused: true });
  };

  onFocus = () => {
    this.focus();
  };

  toggleIsNegative = () => {
    this.setState({ isNegative: !this.state.isNegative }, () => {
      this.onBlur(this.props.value);
    });
  };

  onBlur = value => {
    this.setState({ focused: false, reallyFocused: false });
    if (this.props.onBlur) {
      const absValue = Math.abs(value);
      this.props.onBlur(this.state.isNegative ? -absValue : absValue);
    }
  };

  render() {
    const { textStyle, style, focusedStyle, buttonProps } = this.props;
    const { focused } = this.state;

    return (
      <View>
        <AmountInput
          {...this.props}
          ref={el => (this.amount = el)}
          onBlur={this.onBlur}
          focused={focused}
          style={[
            {
              width: 80,
              transform: [{ translateX: 6 }],
              justifyContent: 'center',
            },
            style,
            focusedStyle,
            !focused && {
              opacity: 0,
              position: 'absolute',
              top: 0,
            },
          ]}
          textStyle={[{ fontSize: 15, textAlign: 'right' }, textStyle]}
        />

        <View>
          {!focused && (
            <Button
              style={{
                position: 'absolute',
                right: 'calc(100% + 5px)',
                top: '8px',
              }}
              onClick={this.toggleIsNegative}
            >
              {this.state.isNegative ? '−' : '+'}
            </Button>
          )}
          <Button
            onClick={this.onFocus}
            // Defines how far touch can start away from the button
            // hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
            {...buttonProps}
            style={[
              buttonProps && buttonProps.style,
              focused && { display: 'none' },
              {
                ':hover': {
                  backgroundColor: 'transparent',
                },
              },
            ]}
            bare={true}
          >
            <View
              style={[
                {
                  borderBottomWidth: 1,
                  borderColor: '#e0e0e0',
                  justifyContent: 'center',
                  transform: [{ translateY: 0.5 }],
                },
                style,
              ]}
            >
              <Text style={[{ fontSize: 15, userSelect: 'none' }, textStyle]}>
                {amountToCurrency(Math.abs(this.props.value))}
              </Text>
            </View>
          </Button>
        </View>
      </View>
    );
  }
}
