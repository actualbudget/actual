import React from 'react';

import { Button } from '@actual-app/components/button';
import { View } from '@actual-app/components/view';

import { usePeopleCSS } from '@desktop-client/hooks/usePeopleCSS';

type DesktopPeopleTaggedNotesProps = {
  content: string;
  onPress?: (content: string) => void;
  person: string;
  separator: string;
};

export function DesktopPeopleTaggedNotes({
  content,
  onPress,
  person,
  separator,
}: DesktopPeopleTaggedNotesProps) {
  const getPeopleCSS = usePeopleCSS();
  return (
    <View style={{ display: 'inline' }}>
      <Button
        variant="bare"
        className={getPeopleCSS(person)}
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
