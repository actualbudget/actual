import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { getStatusLabel } from '@actual-app/core/shared/schedules';
import { titleFirst } from '@actual-app/core/shared/util';

import { Cell } from '#components/table';

type PreviewCategoryCellProps = {
  previewStatus?: string | null;
  selected: boolean;
  width: number;
};

export function PreviewCategoryCell({
  previewStatus,
  selected,
  width,
}: PreviewCategoryCellProps) {
  return (
    <Cell
      name="category"
      width={width}
      plain
      style={{
        padding: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        height: '100%',
      }}
    >
      <View
        style={{
          color:
            previewStatus === 'missed'
              ? theme.errorText
              : previewStatus === 'due'
                ? theme.warningText
                : selected
                  ? theme.formLabelText
                  : theme.upcomingText,
          backgroundColor:
            previewStatus === 'missed'
              ? theme.errorBackground
              : previewStatus === 'due'
                ? theme.warningBackground
                : selected
                  ? theme.formLabelBackground
                  : theme.upcomingBackground,
          margin: '0 5px',
          padding: '3px 7px',
          borderRadius: 4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'inline-block',
          whiteSpace: 'nowrap',
        }}
      >
        <Text>{titleFirst(getStatusLabel(previewStatus ?? ''))}</Text>
      </View>
    </Cell>
  );
}
