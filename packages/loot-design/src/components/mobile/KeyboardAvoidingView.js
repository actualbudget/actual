import React from 'react';
import { KeyboardAvoidingView } from 'react-native';
import { getStatusBarHeight } from 'react-native-status-bar-height';

export default function _KeyboardAvoidingView({
  children,
  enabled = true,
  behavior = 'padding',
  keyboardVerticalOffset = 0,
  includeStatusBar,
  style
}) {
  return (
    <KeyboardAvoidingView
      behavior={behavior}
      style={[{ flex: 1 }, style]}
      keyboardVerticalOffset={
        keyboardVerticalOffset + (includeStatusBar ? getStatusBarHeight() : 0)
      }
      enabled={enabled}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
