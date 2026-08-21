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
  alignItems: 'flex-start',
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

export const actionHeaderClassName = css({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 12px 10px',
  borderBottom: '1px solid var(--color-tableBorder)',
});

export const actionHeaderIconClassName = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 28,
  height: 28,
  borderRadius: 7,
  backgroundColor: 'var(--color-pillBackground)',
  color: 'var(--color-pageTextSubdued)',
  '& > svg': { width: 16, height: 16 },
});

export const favoriteButtonClassName = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 30,
  height: 30,
  padding: 6,
  border: '1px solid var(--color-tableBorder)',
  borderRadius: 7,
  backgroundColor: 'transparent',
  color: 'var(--color-pageTextSubdued)',
  cursor: 'pointer',
  transition:
    'color 120ms ease, background-color 120ms ease, border-color 120ms ease',
  '& > svg': { width: 16, height: 16 },
  '&:hover': {
    color: 'var(--color-pageText)',
    backgroundColor: 'var(--color-pillBackground)',
  },
  '&:focus-visible': {
    outline: '2px solid var(--color-buttonPrimaryBackground)',
    outlineOffset: 2,
  },
  "&[aria-pressed='true']": {
    borderColor: 'var(--color-pageTextPositive)',
    backgroundColor:
      'color-mix(in srgb, var(--color-pageTextPositive) 12%, transparent)',
    color: 'var(--color-pageTextPositive)',
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
});

export const actionItemClassName = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  margin: 0,
  borderRadius: 8,
  fontSize: 13.5,
  cursor: 'pointer',
  '& > svg': {
    flexShrink: 0,
    color: 'var(--color-pageTextSubdued)',
  },
  "&[data-selected='true']": {
    backgroundColor:
      'color-mix(in srgb, var(--color-buttonPrimaryBackground) 15%, transparent)',
  },
  "&[data-selected='true'] > svg": {
    color: 'var(--color-pageText)',
  },
  padding: '8px 10px',
  '&[data-disabled=true]': { opacity: 0.5, cursor: 'default' },
});

export const destructiveActionClassName = css({
  color: 'var(--color-errorText)',
  '& > svg': { color: 'var(--color-errorText)' },
  "&[data-selected='true']": {
    backgroundColor:
      'color-mix(in srgb, var(--color-errorText) 10%, transparent)',
  },
});

export const actionFooterClassName = css({
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  minHeight: 36,
  padding: '7px 12px',
  borderTop: '1px solid var(--color-tableBorder)',
});
