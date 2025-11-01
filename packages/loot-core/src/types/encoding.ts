const SUPPORTED_ENCODINGS = [
  'utf-8',
  'windows-1252', // latin1
  'utf-16le',
  'shift-jis',
  'euc-jp',
  'iso-2022-jp',
  'gbk',
  'gb18030',
  'big5',
  'euc-kr',
] as const;

export type Encoding = (typeof SUPPORTED_ENCODINGS)[number];

export function isSupportedEncoding(encoding: string): encoding is Encoding {
  return SUPPORTED_ENCODINGS.includes(encoding as Encoding);
}
