import crypto from 'crypto';

export function sha256String(str: string) {
  return crypto.createHash('sha256').update(str).digest('base64');
}
