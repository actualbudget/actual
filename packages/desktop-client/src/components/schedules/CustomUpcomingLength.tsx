import { Paragraph } from '../common/Paragraph';
import { View } from '../common/View';

type CustomUpcomingLengthProps = {
  onChange: (value: string) => void;
  tempValue: string;
};

export function CustomUpcomingLength({
  onChange,
  tempValue,
}: CustomUpcomingLengthProps) {
  return (
    <View>
      <Paragraph>Temp:{tempValue}</Paragraph>
    </View>
  );
}
