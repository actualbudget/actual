import { acceptCompletion, completionStatus } from '@codemirror/autocomplete';
import { Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';

export const autocompleteTabAccept = keymap.of([
  {
    key: 'Tab',
    run: view => {
      if (completionStatus(view.state) === 'active') {
        return acceptCompletion(view);
      }
      return false;
    },
  },
]);

/**
 * Give this keymap highest priority so it wins over `basicSetup` bindings like
 * `indentWithTab`.
 */
export const autocompleteTabAcceptHighest = Prec.highest(autocompleteTabAccept);
