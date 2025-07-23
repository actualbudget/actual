import fs from 'fs';

import peg from 'peggy';

export function vitePeggyPlugin() {
  return {
    name: 'vite-peggy',
    transform(code, id) {
      if (id.endsWith('.pegjs')) {
        const source = fs.readFileSync(id, 'utf-8');
        const generated = peg.generate(source, {
          output: 'source',
          format: 'es',
        });
        return {
          code: generated,
          map: null,
        };
      }
    },
  };
}
