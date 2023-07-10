import { integerToCurrency } from 'loot-core/src/shared/util';

export default function format(value, type = 'string') {
  switch (type) {
    case 'string':
      const val = JSON.stringify(value);
      // eslint-disable-next-line rulesdir/typography
      if (val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') {
        return val.slice(1, -1);
      }
      return val;
    case 'number':
      return '' + value;
    case 'financial-with-sign':
      let formatted = format(value, 'financial');
      if (value >= 0) {
        return '+' + formatted;
      }
      return formatted;
    case 'financial':
      if (value == null || value === '' || value === 0) {
        return integerToCurrency(0);
      } else if (typeof value === 'string') {
        const parsed = parseFloat(value);
        value = isNaN(parsed) ? 0 : parsed;
      }

      if (typeof value !== 'number') {
        throw new Error(
          'Value is not a number (' + typeof value + '): ' + value,
        );
      }

      return integerToCurrency(value);
    default:
      throw new Error('Unknown format type: ' + type);
  }
}
