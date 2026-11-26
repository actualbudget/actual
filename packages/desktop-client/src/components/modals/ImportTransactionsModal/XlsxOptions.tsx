import { Trans } from 'react-i18next';

import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import type {
  XlsxImportMetadata,
  XlsxImportOptions,
} from '@actual-app/core/server/transactions/import/xlsx';

import { LabeledCheckbox } from '#components/forms/LabeledCheckbox';

type XlsxOptionsProps = {
  metadata: XlsxImportMetadata | null;
  options: XlsxImportOptions;
  onChange: (options: XlsxImportOptions) => void;
};

export function XlsxOptions({ metadata, options, onChange }: XlsxOptionsProps) {
  return (
    <View style={{ gap: 8, marginTop: 10 }}>
      {metadata && (
        <label htmlFor="xlsx-worksheet">
          <Trans>Worksheet:</Trans>{' '}
          <Select
            id="xlsx-worksheet"
            value={metadata.worksheet}
            options={metadata.worksheets.map(name => [name, name])}
            onChange={worksheet => {
              if (worksheet !== metadata.worksheet) {
                onChange({ worksheet, detectHeader: options.detectHeader });
              }
            }}
          />
        </label>
      )}
      <LabeledCheckbox
        id="xlsx-detect-header"
        checked={options.detectHeader !== false}
        onChange={() =>
          onChange({
            ...options,
            detectHeader: options.detectHeader === false,
            headerRow: undefined,
          })
        }
      >
        <Trans>Detect header and trim rows above</Trans>
      </LabeledCheckbox>
      <label htmlFor="xlsx-header-row">
        <Trans>Header row:</Trans>{' '}
        <Input
          key={`${options.worksheet ?? ''}:${options.headerRow ?? ''}:${options.detectHeader ?? true}`}
          id="xlsx-header-row"
          type="number"
          min={1}
          defaultValue={
            options.headerRow === undefined ? '' : String(options.headerRow)
          }
          placeholder={metadata ? String(metadata.headerRow) : '1'}
          onUpdate={(value, event) => {
            const headerRow = value === '' ? undefined : Number(value);
            if (
              headerRow !== undefined &&
              (!Number.isInteger(headerRow) || headerRow < 1)
            ) {
              event.currentTarget.value =
                options.headerRow === undefined
                  ? ''
                  : String(options.headerRow);
              return;
            }
            if (headerRow !== options.headerRow) {
              onChange({ ...options, headerRow });
            }
          }}
          onEnter={(_value, event) => event.currentTarget.blur()}
          style={{ width: 80 }}
        />
      </label>
      {metadata && (
        <>
          <fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
            <legend style={{ padding: 0, marginBottom: 8 }}>
              <Trans>Select columns that must have a value:</Trans>
            </legend>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {metadata.columns.map((column, index) => (
                <LabeledCheckbox
                  key={column}
                  id={`xlsx-required-${index}`}
                  checked={options.requiredColumns?.includes(index) ?? false}
                  onChange={() =>
                    onChange({
                      ...options,
                      requiredColumns: options.requiredColumns?.includes(index)
                        ? options.requiredColumns.filter(
                            value => value !== index,
                          )
                        : [...(options.requiredColumns ?? []), index],
                    })
                  }
                >
                  {column}
                </LabeledCheckbox>
              ))}
            </View>
          </fieldset>
          <Text>
            <Trans>
              Rows excluded for missing values:{' '}
              {{ count: metadata.excludedRows }}
            </Trans>
          </Text>
        </>
      )}
    </View>
  );
}
