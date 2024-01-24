// @ts-strict-ignore
import React, { useState } from 'react';

import { useLiveQuery } from 'loot-core/src/client/query-hooks';
import { send } from 'loot-core/src/platform/client/fetch';
import { q } from 'loot-core/src/shared/query';

import { SvgCustomNotesPaper } from '../icons/v2';
import { type CSSProperties, theme } from '../style';

import { Button } from './common/Button';
import { View } from './common/View';
import { Notes } from './Notes';
import { Tooltip, type TooltipPosition, useTooltip } from './tooltips';

type NotesTooltipProps = {
  editable?: boolean;
  defaultNotes?: string;
  position?: TooltipPosition;
  onClose?: (notes: string) => void;
};
function NotesTooltip({
  editable,
  defaultNotes,
  position = 'bottom-left',
  onClose,
}: NotesTooltipProps) {
  const [notes, setNotes] = useState<string>(defaultNotes);
  return (
    <Tooltip position={position} onClose={() => onClose(notes)}>
      <Notes
        notes={notes}
        editable={editable}
        focused={editable}
        onChange={setNotes}
      />
    </Tooltip>
  );
}

type NotesButtonProps = {
  id: string;
  width?: number;
  height?: number;
  defaultColor?: string;
  tooltipPosition?: TooltipPosition;
  style?: CSSProperties;
};
export function NotesButton({
  id,
  width = 12,
  height = 12,
  defaultColor = theme.buttonNormalText,
  tooltipPosition,
  style,
}: NotesButtonProps) {
  const [hover, setHover] = useState(false);
  const tooltip = useTooltip();
  const data = useLiveQuery(() => q('notes').filter({ id }).select('*'), [id]);
  const note = data && data.length > 0 ? data[0].note : null;
  const hasNotes = note && note !== '';

  function onClose(notes) {
    send('notes-save', { id, note: notes });
    tooltip.close();
  }

  const [delayHandler, setDelayHandler] = useState(null);

  const handleMouseEnter = () => {
    setDelayHandler(
      setTimeout(() => {
        setHover(true);
      }, 300),
    );
  };

  const handleMouseLeave = () => {
    clearTimeout(delayHandler);
    setHover(false);
  };

  // This account for both the tooltip hover, and editing tooltip
  const tooltipOpen = tooltip.isOpen || (hasNotes && hover);

  return (
    <View
      style={{ flexShrink: 0 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Button
        type="bare"
        aria-label="View notes"
        className={!hasNotes && !tooltipOpen ? 'hover-visible' : ''}
        style={{
          color: defaultColor,
          ...style,
          ...(hasNotes && { display: 'flex !important' }),
          ...(tooltipOpen && { color: theme.buttonNormalText }),
        }}
        {...tooltip.getOpenEvents()}
      >
        <SvgCustomNotesPaper style={{ width, height }} />
      </Button>
      {tooltipOpen && (
        <NotesTooltip
          editable={tooltip.isOpen}
          defaultNotes={note}
          position={tooltipPosition}
          onClose={onClose}
        />
      )}
    </View>
  );
}
