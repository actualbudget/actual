const NUMBER_FORMATS = [
  'comma-dot',
  'dot-comma',
  'space-comma',
  'apostrophe-dot',
  'comma-dot-in',
] as const;

export type NumberFormats = (typeof NUMBER_FORMATS)[number];

export function isNumberFormat(input: string = ''): input is NumberFormats {
  return (NUMBER_FORMATS as readonly string[]).includes(input);
}

export type NumberFormatConfig = {
  format?: NumberFormats;
  hideFraction?: boolean;
  decimalPlaces?: number;
};

export function getNumberFormat(config: NumberFormatConfig = {}): {
  formatter: Intl.NumberFormat;
  resolvedConfig: Required<Omit<NumberFormatConfig, 'format'>> & {
    format: NumberFormats;
  };
} {
  // Resolve configuration with defaults
  const resolvedConfig = {
    format: config.format || 'comma-dot',
    hideFraction: config.hideFraction || false,
    decimalPlaces:
      config.decimalPlaces !== undefined ? config.decimalPlaces : 2,
  };

  // Ensure the type reflects the defaults applied
  const requiredResolvedConfig = resolvedConfig as Required<
    Omit<NumberFormatConfig, 'format'>
  > & { format: NumberFormats };

  // Determine Intl.NumberFormat options
  const options: Intl.NumberFormatOptions = {
    style: 'decimal',
    minimumFractionDigits: requiredResolvedConfig.hideFraction
      ? 0
      : requiredResolvedConfig.decimalPlaces,
    maximumFractionDigits: requiredResolvedConfig.hideFraction
      ? 0
      : requiredResolvedConfig.decimalPlaces,
  };

  let locale = 'en-US'; // Default: comma-dot (1,234.56)
  switch (requiredResolvedConfig.format) {
    case 'dot-comma':
      locale = 'de-DE'; // dot-comma (1.234,56)
      break;
    case 'space-comma':
      locale = 'fr-FR'; // space-comma (1 234,56)
      break;
    case 'apostrophe-dot':
      locale = 'de-CH'; // apostrophe-dot (1’234.56) - Verify this locale's behavior
      break;
    case 'comma-dot-in':
      locale = 'en-IN'; // comma-dot-in (1,00,000.00)
      break;
    case 'comma-dot':
    default:
      locale = 'en-US'; // Explicit default
      break;
  }

  try {
    // Create the formatter using the determined locale and options
    const formatter = new Intl.NumberFormat(locale, options);
    return { formatter, resolvedConfig: requiredResolvedConfig };
  } catch (error) {
    console.error(
      `Error creating Intl.NumberFormat with locale ${locale} and options:`,
      options,
      error,
    );
    // Fallback to default locale and basic options in case of error
    const fallbackFormatter = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: options.minimumFractionDigits,
      maximumFractionDigits: options.maximumFractionDigits,
    });
    // Use the original resolved config even on fallback
    return {
      formatter: fallbackFormatter,
      resolvedConfig: requiredResolvedConfig,
    };
  }
}
