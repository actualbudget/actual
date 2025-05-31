import React from 'react';

import { Button } from '@actual-app/components/button';
import { View } from '@actual-app/components/view';

import { useTagCSS } from '@desktop-client/style/tags';

type DesktopTaggedNotesProps = {
  content: string;
  onPress?: (content: string) => void;
  tag: string;
  separator: string;
};

export function DesktopTaggedNotes({
  content,
  onPress,
  tag,
  separator,
}: DesktopTaggedNotesProps) {
  const getTagCSS = useTagCSS();
  return (
    <View style={{ display: 'inline' }}>
      <Button
        variant="bare"
        className={getTagCSS(tag)}
        onPress={() => {
          onPress?.(content);
        }}
      >
        {content}
      </Button>
      {separator}
    </View>
  );
}
