import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';

type CustomUpcomingLengthProps = {
  onChange: (value: string) => void;
  tempValue: string;
};

export function CustomUpcomingLength({
  onChange,
  tempValue,
}: CustomUpcomingLengthProps) {
  const { t } = useTranslation();

  const options = [
    { value: 'day', label: t('Days') },
    { value: 'week', label: t('Weeks') },
    { value: 'month', label: t('Months') },
    { value: 'year', label: t('Years') },
  ];

  let timePeriod = [];
  if (tempValue === 'custom') {
    timePeriod = ['1', 'day'];
  } else {
    timePeriod = tempValue.split('-');
  }

  const [numValue, setNumValue] = useState(parseInt(timePeriod[0]));
  const [unit, setUnit] = useState(timePeriod[1]);

  useEffect(() => {
    onChange(`${numValue}-${unit}`);
  }, [numValue, onChange, unit]);

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10 }}
    >
      <Input
        id="length"
        style={{ width: 40 }}
        type="number"
        min={1}
        onChangeValue={value => setNumValue(parseInt(value))}
        defaultValue={numValue || 1}
      />
      <Select
        options={options.map(x => [x.value, x.label])}
        value={unit}
        onChange={newValue => setUnit(newValue)}
      />
    </div>
  );
}
