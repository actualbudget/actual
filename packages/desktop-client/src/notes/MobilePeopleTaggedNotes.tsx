import React from 'react';

import { Text } from '@actual-app/components/text';

import { usePeopleCSS } from '@desktop-client/hooks/usePeopleCSS';

type MobilePeopleTaggedNotesProps = {
  content: string;
  person: string;
  separator: string;
};

export function MobilePeopleTaggedNotes({
  content,
  person,
  separator,
}: MobilePeopleTaggedNotesProps) {
  const getPeopleCSS = usePeopleCSS();
  return (
    <>
      <Text className={getPeopleCSS(person, { compact: true })}>{content}</Text>
      {separator}
    </>
  );
}
