export function isKeyValueCache(remittance_information: string[]):
  | {
      header?: string;
      map: Map<string, string>;
    }
  | undefined {
  const map = new Map<string, string>();
  let currentKey = null;
  let header = null;
  for (const line of remittance_information) {
    const matches = line.match(/^(?<key>[a-zA-Z]+): (?<value>.*)/);
    if (matches) {
      const { key, value } = matches.groups || {};
      if (key) {
        currentKey = key;
        map.set(key, value ?? '');
      }
    } else if (currentKey) {
      //no match but key already found;
      const currentValue = map.get(currentKey) ?? '';
      map.set(currentKey, currentValue + '\n' + line);
    } else {
      header = header ? header + '\n' + line : line;
    }
  }

  if (map.size) {
    return {
      header: header ?? undefined,
      map,
    };
  }
}
