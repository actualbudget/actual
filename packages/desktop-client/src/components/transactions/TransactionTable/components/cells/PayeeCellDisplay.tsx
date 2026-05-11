import { SvgSplit } from '@actual-app/components/icons/v0';
import {
  SvgArrowsSynchronize,
  SvgCalendar3,
  SvgHyperlink2,
} from '@actual-app/components/icons/v2';
import { theme } from '@actual-app/components/theme';

type PayeeDisplayMode = 'plain' | 'transfer' | 'schedule' | 'split';

type PayeeCellDisplayProps = {
  displayPayee: string;
  mode: PayeeDisplayMode;
  onClick?: () => void;
};

function PayeeModeIcon({ mode }: { mode: PayeeDisplayMode }) {
  const iconStyle = {
    width: 10,
    height: 10,
    marginRight: 5,
    color: theme.pageTextSubdued,
    flexShrink: 0,
  };

  if (mode === 'split') {
    return (
      <SvgSplit
        style={{
          width: 14,
          height: 14,
          marginRight: 5,
          color: theme.pageTextSubdued,
          flexShrink: 0,
        }}
      />
    );
  }

  if (mode === 'schedule') {
    return <SvgCalendar3 style={iconStyle} />;
  }

  if (mode === 'transfer') {
    return <SvgArrowsSynchronize style={iconStyle} />;
  }

  return null;
}

export function PayeeCellDisplay({
  displayPayee,
  mode,
  onClick,
}: PayeeCellDisplayProps) {
  const showLink = mode === 'transfer' || mode === 'schedule';
  const isSplit = mode === 'split';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexGrow: 1,
        overflow: 'hidden',
      }}
      onClick={showLink ? onClick : undefined}
      onKeyDown={
        showLink
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      role={showLink ? 'button' : undefined}
      tabIndex={showLink ? 0 : undefined}
    >
      <PayeeModeIcon mode={mode} />
      {showLink && (
        <SvgHyperlink2
          style={{
            width: 9,
            height: 9,
            marginRight: 4,
            color: theme.pageTextLink,
          }}
        />
      )}
      <span
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: isSplit ? theme.pageTextSubdued : undefined,
        }}
      >
        {displayPayee}
      </span>
    </div>
  );
}
