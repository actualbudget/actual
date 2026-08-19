import { css, keyframes } from '@emotion/css';

export const overlayEnter = keyframes({
  from: { opacity: 0 },
});

export const dialogEnter = keyframes({
  from: {
    opacity: 0,
    transform: 'translateX(-50%) translateY(-10px) scale(0.98)',
  },
});

const pageEnter = keyframes({
  from: { opacity: 0, transform: 'translateX(8px)' },
});

export const pageEnterClassName = css({
  '@media (prefers-reduced-motion: no-preference)': {
    animation: `${pageEnter} 0.14s ease`,
  },
});

export const paletteGroupClassName = css({
  '& [cmdk-group-heading]': {
    padding: '9px 10px 4px',
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: 'var(--color-pageTextSubdued)',
  },
});

export const paletteItemClassName = css({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '7px 10px',
  margin: 0,
  borderRadius: 8,
  fontSize: 13.5,
  cursor: 'pointer',
  '& > svg': {
    flexShrink: 0,
    color: 'var(--color-pageTextSubdued)',
  },
  // Selection follows keyboard and pointer (cmdk selects on pointer move),
  // so no separate :hover style to fight it.
  "&[data-selected='true']": {
    backgroundColor:
      'color-mix(in srgb, var(--color-buttonPrimaryBackground) 15%, transparent)',
  },
  "&[data-selected='true'] > svg": {
    color: 'var(--color-pageText)',
  },
});
