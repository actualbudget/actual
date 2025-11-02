const SUPPORTED_ENCODINGS = [
  'utf-8', // Unicode (UTF-8)
  'windows-1252', // Western Europe (Windows-1252 / ISO-8859-1)
  'utf-16le', // Unicode (UTF-16 LE)
  'shift-jis', // Japanese (Shift_JIS)
  'euc-jp', // Japanese (EUC-JP)
  'iso-2022-jp', // Japanese (ISO-2022-JP)
  'gbk', // Chinese Simplified (GBK)
  'gb18030', // Chinese Simplified (GB18030)
  'big5', // Chinese Traditional (Big5)
  'euc-kr', // Korean (EUC-KR)
] as const;

export type Encoding = (typeof SUPPORTED_ENCODINGS)[number];

export function isSupportedEncoding(encoding: string): encoding is Encoding {
  return SUPPORTED_ENCODINGS.includes(encoding as Encoding);
}
