import React, { createRef, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

import { type CSSProperties, css } from 'glamor';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

import q from 'loot-core/src/client/query-helpers';
import { useLiveQuery } from 'loot-core/src/client/query-hooks';
import { send } from 'loot-core/src/platform/client/fetch';

import CustomNotesPaper from '../icons/v2/CustomNotesPaper';
import { colors } from '../style';

import Button from './common/Button';
import Text from './common/Text';
import View from './common/View';
import { Tooltip, useTooltip } from './tooltips';

function sequentialNewlinesPlugin() {
  // Adapted from https://codesandbox.io/s/create-react-app-forked-h3rmcy?file=/src/sequentialNewlinePlugin.js:0-774
  const data = this.data();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function add(field: string, value: any) {
    const list = data[field] ? data[field] : (data[field] = []);

    list.push(value);
  }

  add('fromMarkdownExtensions', {
    enter: {
      lineEndingBlank: function enterLineEndingBlank(token: unknown) {
        this.enter(
          {
            type: 'break',
            value: '',
            data: {},
            children: [],
          },
          token,
        );
      },
    },
    exit: {
      lineEndingBlank: function exitLineEndingBlank(token: unknown) {
        this.exit(token);
      },
    },
  });
}

const remarkPlugins = [sequentialNewlinesPlugin, remarkGfm, remarkBreaks];

const markdownStyles = css({
  display: 'block',
  maxWidth: 350,
  padding: 8,
  overflowWrap: 'break-word',
  '& p': {
    margin: 0,
    ':not(:first-child)': {
      marginTop: '0.25rem',
    },
  },
  '& ul, & ol': {
    listStylePosition: 'inside',
    margin: 0,
    paddingLeft: 0,
  },
  '&>* ul, &>* ol': {
    marginLeft: '1.5rem',
  },
  '& li>p': {
    display: 'contents',
  },
  '& blockquote': {
    paddingLeft: '0.75rem',
    borderLeft: '3px solid ' + colors.p6,
    margin: 0,
  },
  '& hr': {
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    borderBottom: '1px solid ' + colors.p9,
  },
  '& code': {
    backgroundColor: colors.p10,
    padding: '0.1rem 0.5rem',
    borderRadius: '0.25rem',
  },
  '& pre': {
    padding: '0.5rem',
    backgroundColor: colors.p10,
    borderRadius: '0.5rem',
    margin: 0,
    ':not(:first-child)': {
      marginTop: '0.25rem',
    },
    '& code': {
      background: 'inherit',
      padding: 0,
      borderRadius: 0,
    },
  },
  '& table, & th, & td': {
    border: '1px solid ' + colors.p9,
  },
  '& table': {
    borderCollapse: 'collapse',
    wordBreak: 'break-word',
  },
  '& td': {
    padding: '0.25rem 0.75rem',
  },
});

type NotesTooltipProps = {
  editable?: boolean;
  defaultNotes?: string;
  position?: string;
  onClose?: (notes: string) => void;
};
function NotesTooltip({
  editable,
  defaultNotes,
  position = 'bottom-left',
  onClose,
}: NotesTooltipProps) {
  let [notes, setNotes] = useState<string>(defaultNotes);
  let inputRef = createRef<HTMLTextAreaElement>();

  useEffect(() => {
    if (editable) {
      inputRef.current.focus();
    }
  }, [inputRef, editable]);

  return (
    <Tooltip position={position} onClose={() => onClose(notes)}>
      {editable ? (
        <textarea
          ref={inputRef}
          {...css({
            border: '1px solid ' + colors.border,
            padding: 7,
            minWidth: 350,
            minHeight: 120,
            outline: 'none',
          })}
          value={notes || ''}
          onChange={e => setNotes(e.target.value)}
        />
      ) : (
        <Text {...markdownStyles}>
          <ReactMarkdown
            remarkPlugins={remarkPlugins}
            linkTarget="_blank"
            children={notes}
          />
        </Text>
      )}
    </Tooltip>
  );
}

type NotesButtonProps = {
  id: string;
  width?: number;
  height?: number;
  defaultColor?: string;
  tooltipPosition?: string;
  style?: CSSProperties;
};
export default function NotesButton({
  id,
  width = 12,
  height = 12,
  defaultColor = colors.n8,
  tooltipPosition,
  style,
}: NotesButtonProps) {
  let [hover, setHover] = useState(false);
  let tooltip = useTooltip();
  let data = useLiveQuery(() => q('notes').filter({ id }).select('*'), [id]);
  let note = data && data.length > 0 ? data[0].note : null;
  let hasNotes = note && note !== '';

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
      style={[{ flexShrink: 0 }]}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Button
        type="bare"
        className={!hasNotes && !tooltipOpen ? 'hover-visible' : ''}
        style={[
          { color: defaultColor },
          style,
          hasNotes && { display: 'flex !important' },
          tooltipOpen && { color: colors.n1 },
        ]}
        {...tooltip.getOpenEvents()}
      >
        <CustomNotesPaper style={{ width, height }} />
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
