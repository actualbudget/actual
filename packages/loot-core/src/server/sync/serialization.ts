// Sync message values travel as tagged strings — "0:" for null, "N:"
// for numbers, "S:" for strings; newer app versions may introduce more
// prefixes.

// A value serialized by a newer version of the app with a type prefix
// this version doesn't know. Carried opaquely through the sync pipeline
// so the message can still be acknowledged into the crdt log and
// deferred with its original encoding intact (see `apply` in ./index.ts).
export type UnknownFormatValue = { kind: 'unknown-format'; raw: string };

export function isUnknownFormatValue(
  value: unknown,
): value is UnknownFormatValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    value.kind === 'unknown-format'
  );
}

export function serializeValue(
  value: string | number | null | UnknownFormatValue,
): string {
  if (isUnknownFormatValue(value)) {
    return value.raw;
  } else if (value === null) {
    return '0:';
  } else if (typeof value === 'number') {
    return 'N:' + value;
  } else if (typeof value === 'string') {
    return 'S:' + value;
  }

  throw new Error('Unserializable value type: ' + JSON.stringify(value));
}

export function deserializeValue(value: string): string | number | null {
  const type = value[0];
  switch (type) {
    case '0':
      return null;
    case 'N':
      return parseFloat(value.slice(2));
    case 'S':
      return value.slice(2);
    default:
  }

  throw new Error('Invalid type key for value: ' + value);
}

// For inbound messages, which may come from a newer version of the app:
// an unknown value format must not abort the sync — `apply` defers the
// message instead, exactly like a missing table/column
export function deserializeValueSafe(
  value: string,
): string | number | null | UnknownFormatValue {
  try {
    return deserializeValue(value);
  } catch {
    return { kind: 'unknown-format', raw: value };
  }
}
