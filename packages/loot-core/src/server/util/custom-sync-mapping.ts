export type Mappings = Map<string, Map<string, string>>;

export const mappingsToString = (mapping: Mappings): string =>
  JSON.stringify(
    Object.fromEntries(
      [...mapping.entries()].map(([key, value]) => [
        key,
        Object.fromEntries(value),
      ]),
    ),
  );

export const mappingsFromString = (str: string): Mappings =>
  new Map(
    Object.entries(JSON.parse(str)).map(([key, value]) => [
      key,
      new Map(Object.entries(value as object)),
    ]),
  );

export const defaultMappings: Mappings = new Map([
  [
    'payment',
    new Map([
      ['date', 'date'],
      ['payee', 'payeeName'],
      ['notes', 'remittanceInformationUnstructured'],
    ]),
  ],
  [
    'deposit',
    new Map([
      ['date', 'date'],
      ['payee', 'payeeName'],
      ['notes', 'remittanceInformationUnstructured'],
    ]),
  ],
]);
