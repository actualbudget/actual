import { useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { MonthPicker } from '@actual-app/components/month-picker';

import {
  hideNativeDateIconClassName,
  InputField,
} from '#components/mobile/MobileForms';
import { useLanguage } from '#hooks/useLocale';

type MonthInputProps = {
  id: string;
  value: string;
  onChange: (month: string) => void;
};

// mobile keeps the native month input; desktop uses the custom month picker
export function MonthInput({ id, value, onChange }: MonthInputProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { isNarrowWidth } = useResponsive();
  if (isNarrowWidth) {
    return (
      <InputField
        id={id}
        type="month"
        value={value}
        onChange={event => onChange(event.target.value)}
        className={hideNativeDateIconClassName}
        style={{
          width: '100%',
          marginLeft: 0,
          marginRight: 0,
          boxSizing: 'border-box',
          WebkitAppearance: 'none',
          appearance: 'none',
        }}
      />
    );
  }
  return (
    <MonthPicker
      id={id}
      value={value}
      locale={language}
      placeholder={t('Select month')}
      labels={{ previous: t('Previous'), next: t('Next') }}
      onChange={onChange}
    />
  );
}
