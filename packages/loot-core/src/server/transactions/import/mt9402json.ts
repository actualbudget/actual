type MT940Transaction = {
  amount: number;
  date: string;
  payee_name: string | null;
  imported_payee: string | null;
  notes: string | null;
  imported_id: string | null;
};

type MT940Field = {
  tag: string;
  lines: string[];
};

type MT940ParseResult = {
  transactions: MT940Transaction[];
};

function decodeContents(contents: string | Uint8Array): string {
  if (typeof contents === 'string') {
    return contents;
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(contents);
  } catch {
    return new TextDecoder('windows-1252').decode(contents);
  }
}

function parseFields(contents: string): MT940Field[] {
  const fields: MT940Field[] = [];
  let current: MT940Field | null = null;

  for (const line of contents.replace(/\r\n?/g, '\n').split('\n')) {
    const match = line.match(/^:([0-9]{2}[A-Z]?):(.*)$/);
    if (match) {
      if (current) {
        fields.push(current);
      }
      current = { tag: match[1], lines: [match[2]] };
    } else if (current && line !== '-}') {
      current.lines.push(line);
    }
  }

  if (current) {
    fields.push(current);
  }

  return fields;
}

function parseDate(value: string): string {
  return `20${value.slice(0, 2)}-${value.slice(2, 4)}-${value.slice(4, 6)}`;
}

function parseAmount(value: string): number {
  const normalized = value.includes(',')
    ? value.replace(/\./g, '').replace(',', '.')
    : value;
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) {
    throw new Error(`Invalid MT940 amount: ${value}`);
  }
  return amount;
}

function parse61(value: string) {
  const match = value.match(
    /^([0-9]{6})(?:[0-9]{4})?(R?[CD])([A-Z]?)([0-9.,]+)(.*)$/,
  );
  if (!match) {
    throw new Error(`Invalid MT940 :61 field: ${value}`);
  }

  const date = parseDate(match[1]);
  const amount = parseAmount(match[4]);
  const reference = match[5].trim().replace(/\s+/g, ' ');
  const bankReference = reference.match(/\/\/([^\s]+)/)?.[1];

  return {
    date,
    amount: match[2].endsWith('D') ? -amount : amount,
    reference,
    imported_id: bankReference || null,
  };
}

const PAYEE_SUBTAGS = ['NAME', '32', '33'];
const NOTES_SUBTAGS = ['REMI', '20', '21', '22', '23', '24', '25', '00'];
const QUESTION_SUBTAGS = new Set([...PAYEE_SUBTAGS, ...NOTES_SUBTAGS]);

function joinSubtags(
  details: Record<string, string>,
  subtags: string[],
): string | null {
  const value = subtags
    .map(tag => details[tag]?.trim())
    .filter(Boolean)
    .join(' ')
    .trim();
  return value || null;
}

function parseSlashDetails(value: string): Record<string, string> | null {
  if (!value.startsWith('/')) {
    return null;
  }

  const parts = value.split('/').filter(Boolean);
  const details: Record<string, string> = {};
  for (let index = 0; index + 1 < parts.length; index += 2) {
    details[parts[index]] = parts[index + 1];
  }
  return details;
}

function parseQuestionDetails(value: string): Record<string, string> | null {
  let payload = value;
  const bankPrefix = payload.match(/^[A-Z0-9]{2,4}\?/);

  if (bankPrefix) {
    const firstTag = payload.slice(
      bankPrefix[0].length,
      bankPrefix[0].length + 2,
    );
    if (!QUESTION_SUBTAGS.has(firstTag)) {
      return null;
    }
    payload = payload.slice(bankPrefix[0].length);
  } else if (payload.startsWith('?')) {
    payload = payload.slice(1);
  }

  const details: Record<string, string> = {};
  for (const segment of payload.split(/\?(?=[A-Z0-9]{2})/)) {
    const match = segment.match(/^([A-Z0-9]{2})(.*)$/);
    if (!match || !QUESTION_SUBTAGS.has(match[1])) {
      return null;
    }
    details[match[1]] = [details[match[1]], match[2].trim()]
      .filter(Boolean)
      .join(' ');
  }
  return details;
}

function parseCodePrefixedDetails(
  lines: string[],
  extraDetails: string,
): { payee_name: string | null; notes: string | null } {
  const [firstLine, ...rest] = lines;
  const prefix = firstLine.match(/^[A-Z0-9]{2,4}\?/);
  let payee = (prefix ? firstLine.slice(prefix[0].length) : firstLine).trim();
  let notes = rest
    .map(line => line.trim())
    .filter(Boolean)
    .join(' ');
  const suffix = extraDetails.trim();

  if (
    !notes &&
    suffix &&
    payee.length > suffix.length &&
    payee.endsWith(suffix)
  ) {
    payee = payee.slice(0, -suffix.length).trim();
    notes = suffix;
  }

  return {
    payee_name: payee || notes || null,
    notes: payee && notes ? notes : null,
  };
}

function parse86(
  lines: string[],
  extraDetails: string,
): { payee_name: string | null; notes: string | null } {
  const normalizedLines = lines
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const raw = normalizedLines.join('\n');
  const slashDetails = parseSlashDetails(raw);
  const questionDetails = slashDetails ? null : parseQuestionDetails(raw);
  const details = slashDetails ?? questionDetails;

  if (details) {
    const payee = joinSubtags(details, PAYEE_SUBTAGS);
    const notes = joinSubtags(details, NOTES_SUBTAGS);
    return payee
      ? { payee_name: payee, notes }
      : { payee_name: notes || raw, notes: null };
  }

  return parseCodePrefixedDetails(normalizedLines, extraDetails);
}

export function mt9402json(contents: string | Uint8Array): MT940ParseResult {
  const fields = parseFields(decodeContents(contents));
  const transactions: MT940Transaction[] = [];

  for (let index = 0; index < fields.length; index++) {
    const field = fields[index];
    if (field.tag !== '61') {
      continue;
    }

    const { reference, ...transaction } = parse61(field.lines[0]);
    const supplementaryDetails = field.lines.slice(1).join(' ').trim();
    const details =
      fields[index + 1]?.tag === '86'
        ? parse86(fields[++index].lines, supplementaryDetails)
        : { payee_name: null, notes: null };
    const payee =
      details.payee_name || supplementaryDetails || reference || null;
    const notes = details.payee_name
      ? details.notes
      : supplementaryDetails || details.notes;

    transactions.push({
      ...transaction,
      payee_name: payee,
      imported_payee: payee,
      notes,
    });
  }

  if (transactions.length === 0) {
    throw new Error('No MT940 transactions found');
  }

  return { transactions };
}
