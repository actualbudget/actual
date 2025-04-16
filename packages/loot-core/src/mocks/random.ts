import * as Platform from '../shared/platform';

// Fake "random" function used to have stable data structures for
// e2e and visual regression tests
let pseudoRandomIterator = 0;
function pseudoRandom(): number {
  pseudoRandomIterator += 0.45;

  if (pseudoRandomIterator > 1) {
    pseudoRandomIterator = 0;
  }

  return pseudoRandomIterator;
}

export const random = Platform.isPlaywright ? pseudoRandom : Math.random;
