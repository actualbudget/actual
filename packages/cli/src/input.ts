import { readFileSync } from 'fs';

export function readJsonInput(cmdOpts: {
  data?: string;
  file?: string;
}): unknown {
  if (cmdOpts.data && cmdOpts.file) {
    throw new Error('Cannot use both --data and --file');
  }
  if (cmdOpts.data) {
    return JSON.parse(cmdOpts.data);
  }
  if (cmdOpts.file) {
    const content =
      cmdOpts.file === '-'
        ? readFileSync(0, 'utf-8')
        : readFileSync(cmdOpts.file, 'utf-8');
    return JSON.parse(content);
  }
  throw new Error('Either --data or --file is required');
}
