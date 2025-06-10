import React from 'react';

import { Text } from '@actual-app/components/text';

import { useTagCSS } from '@desktop-client/style/tags';

type MobileTaggedNotesProps = {
  content: string;
  tag: string;
  separator: string;
};

export function MobileTaggedNotes({
  content,
  tag,
  separator,
}: MobileTaggedNotesProps) {
  const getTagCSS = useTagCSS();
  return (
    <>
      <Text className={getTagCSS(tag, { compact: true })}>{content}</Text>
      {separator}
    </>
  );
}
