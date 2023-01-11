import React from 'react';
import { View, Text, TextInput } from 'react-native';
import Stack from 'loot-design/src/components/Stack';
import { ButtonWithLoading } from 'loot-design/src/components/mobile/common';
import { colors, styles } from 'loot-design/src/style';

export default function SingleInput({
  title,
  value,
  loading,
  error,
  inputProps,
  onChange,
  onSubmit
}) {
  let textStyle = [
    styles.text,
    { fontSize: 17, lineHeight: 25, color: 'white' }
  ];

  return (
    <View style={{ alignSelf: 'stretch' }}>
      <Text style={[textStyle, { fontSize: 16, fontWeight: '700' }]}>
        {title}
      </Text>

      <Stack spacing={2} direction="row">
        <TextInput
          style={{
            flex: 1,
            borderRadius: 4,
            padding: 10,
            backgroundColor: 'white',
            fontSize: 18
          }}
          blurOnSubmit={false}
          autoFocus={true}
          autoCorrect={false}
          autoCapitalize="none"
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onSubmit}
          {...inputProps}
        />
        <ButtonWithLoading
          primary
          loading={loading}
          loadingColor={colors.n1}
          style={{ backgroundColor: 'white' }}
          contentStyle={{ borderWidth: 0 }}
          textStyle={{ fontSize: 17, color: colors.n1 }}
          onPress={() => onSubmit()}
        >
          Next
        </ButtonWithLoading>
      </Stack>

      {error && (
        <Text
          style={[
            textStyle,
            {
              color: colors.r9,
              alignSelf: 'center',
              marginTop: 5
            }
          ]}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
