import type {
  fetchFaviconDirect as Fn,
  fetchImageDirect as FnImg,
} from '#server/accounts/favicon-direct';

export const fetchFaviconDirect: typeof Fn | null = null;
export const fetchImageDirect: typeof FnImg | null = null;
