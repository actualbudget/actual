import { useTranslation } from 'react-i18next';

import {
  SvgCheveronDown,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';

type ExpandChevronProps = {
  isExpanded: boolean;
  onToggle: () => void;
};

/**
 * Chevron that toggles the expanded/collapsed state of a tree node.
 * Uses a plain `<button>` with an explicit `onToggle` callback so we
 * bypass the react-aria slot mechanism (which doesn't reliably fire
 * in all configurations) and directly update `expandedKeys`.
 */
export function ExpandChevron({ isExpanded, onToggle }: ExpandChevronProps) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      aria-label={isExpanded ? t('Collapse') : t('Expand')}
      onPointerDownCapture={e => {
        e.stopPropagation();
      }}
      onClick={e => {
        e.stopPropagation();
        onToggle();
      }}
      onPointerDown={e => e.stopPropagation()}
      style={{
        all: 'unset',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        width: 12,
        height: 12,
      }}
    >
      {isExpanded ? (
        <SvgCheveronDown width={12} height={12} />
      ) : (
        <SvgCheveronRight width={12} height={12} />
      )}
    </button>
  );
}
