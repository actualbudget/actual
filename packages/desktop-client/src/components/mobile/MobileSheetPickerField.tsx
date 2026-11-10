import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

type MobileSheetPickerFieldProps = {
  label: string;
  placeholder: string;
  valueName?: string;
  onPress: () => void;
};

export function MobileSheetPickerField({
  label,
  placeholder,
  valueName,
  onPress,
}: MobileSheetPickerFieldProps) {
  return (
    <Button
      variant="normal"
      aria-label={label}
      aria-haspopup="dialog"
      onPress={onPress}
      style={{
        ...styles.mediumText,
        width: '100%',
        height: styles.mobileMinHeight,
        justifyContent: 'flex-start',
        fontWeight: 400,
        color: valueName ? theme.formInputText : theme.formInputTextPlaceholder,
      }}
    >
      <Text style={styles.ellipsisText}>{valueName || placeholder}</Text>
    </Button>
  );
}
