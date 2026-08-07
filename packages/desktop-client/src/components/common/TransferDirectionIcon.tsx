import { SvgLeftArrow2, SvgRightArrow2 } from '@actual-app/components/icons/v0';
import type { CSSProperties } from '@actual-app/components/styles';

type TransferDirectionIconProps = {
  isDeposit?: boolean;
  style?: CSSProperties;
};

export function TransferDirectionIcon({
  isDeposit,
  style,
}: TransferDirectionIconProps) {
  return isDeposit ? (
    <SvgLeftArrow2 style={style} />
  ) : (
    <SvgRightArrow2 style={style} />
  );
}
