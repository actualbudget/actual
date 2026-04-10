import {
  SvgArrowsSynchronize,
  SvgCalendar3,
  SvgHyperlink2,
} from '@actual-app/components/icons/v2';
import { theme } from '@actual-app/components/theme';

type PayeeDisplayMode = 'plain' | 'transfer' | 'schedule';

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
  const showLink = mode !== 'plain';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexGrow: 1,
        overflow: 'hidden',
      }}
      onClick={showLink ? onClick : undefined}
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
        }}
      >
        {displayPayee}
      </span>
    </div>
  );
}
