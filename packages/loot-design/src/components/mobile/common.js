import React from 'react';
import { Text, View } from 'react-native';
import { RectButton } from 'react-native-gesture-handler';
import { styles, colors } from '../../style';
import Loading from '../../svg/v1/AnimatedLoading';

export class Button extends React.Component {
  render() {
    const {
      children,
      pressed,
      primary,
      hover,
      bare,
      style,
      contentStyle,
      textStyle,
      disabled,
      onPress,
      hitSlop = { top: 5, left: 5, bottom: 5, right: 5 },
      ...nativeProps
    } = this.props;

    // This sucks. Unfortunatey RNGH's RectButton does not properly
    // implement all the style props. border and padding do not work
    // on Android, which means we need to use an inner View for that.
    // We apply the user style on the inner view, but we need to apply
    // the margin on the outer view so we strip it off. It's annoying,
    // and hopefully RectButton will be fixed in the future.

    return (
      <RectButton
        onPress={onPress}
        hitSlop={hitSlop}
        style={[
          { overflow: 'visible', borderRadius: 4 },
          {
            backgroundColor: bare
              ? 'transparent'
              : primary
              ? disabled
                ? colors.n6
                : colors.p5
              : 'white',
            alignItems: 'stretch',
            justifyContent: 'center'
          },
          style
        ]}
        disabled={disabled}
        {...nativeProps}
      >
        <View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: bare ? 0 : 1,
              borderColor: primary ? colors.p5 : colors.n9,
              borderRadius: 4
            },
            !bare && {
              paddingVertical: 8,
              paddingHorizontal: 20
            },
            contentStyle
          ]}
        >
          {typeof children === 'string' ? (
            <Text
              style={[
                {
                  color: primary ? 'white' : disabled ? colors.n6 : colors.n1,
                  fontSize: 16
                },
                textStyle
              ]}
            >
              {children}
            </Text>
          ) : (
            children
          )}
        </View>
      </RectButton>
    );
  }
}

export const ButtonWithLoading = React.forwardRef((allProps, ref) => {
  let { loading, loadingColor, children, textStyle, ...props } = allProps;
  return (
    <Button {...props} style={[{ position: 'relative' }, props.style]}>
      {loading && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Loading
            color={loadingColor || 'white'}
            style={{ width: 25, height: 25 }}
          />
        </View>
      )}
      <Text
        style={[
          {
            opacity: loading ? 0 : 1,
            color: props.primary
              ? 'white'
              : props.disabled
              ? colors.n6
              : colors.n1,
            fontSize: 15
          },
          textStyle
        ]}
      >
        {children}
      </Text>
    </Button>
  );
});

export function KeyboardButton({ highlighted, children, ...props }) {
  return (
    <Button
      {...props}
      bare
      style={[
        {
          backgroundColor: 'white',
          shadowColor: colors.n3,
          shadowOffset: { width: 0, height: 1 },
          shadowRadius: 1,
          shadowOpacity: 1,
          elevation: 4,
          borderWidth: 0,
          paddingHorizontal: 17
        },
        highlighted && { backgroundColor: colors.p6 },
        props.style
      ]}
      textStyle={[highlighted && { color: 'white' }]}
    >
      {children}
    </Button>
  );
}

export const Card = React.forwardRef(({ children, ...props }, ref) => {
  return (
    <View
      {...props}
      ref={ref}
      style={[
        {
          marginTop: 15,
          marginHorizontal: 5,
          borderRadius: 6,
          backgroundColor: 'white',
          borderColor: colors.p3,
          shadowColor: '#9594A8',
          shadowOffset: { width: 0, height: 1 },
          shadowRadius: 1,
          shadowOpacity: 1
        },
        props.style
      ]}
    >
      <View
        style={{
          borderRadius: 6,
          overflow: 'hidden'
        }}
      >
        {children}
      </View>
    </View>
  );
});

export function Label({ title, style }) {
  return (
    <Text
      style={[
        styles.text,
        {
          color: colors.n2,
          textAlign: 'right',
          fontSize: 12,
          marginBottom: 2
        },
        style
      ]}
    >
      {title}
    </Text>
  );
}

export function TextOneLine({ children, centered, ...props }) {
  return (
    <Text numberOfLines={1} {...props}>
      {children}
    </Text>
  );
}
