import React from 'react';

import { Text } from '@actual-app/components/text';

import { usePeopleCSS } from '@desktop-client/hooks/usePeopleCSS';

type MobilePeopleNotesProps = {
  content: string;
  person: string;
  separator: string;
};

export function MobilePeopleNotes({
  content,
  person,
  separator,
}: MobilePeopleNotesProps) {
  const getPeopleCSS = usePeopleCSS();
  return (
    <>
      <Text className={getPeopleCSS(person, { compact: true })}>{content}</Text>
      {separator}
    </>
  );
}
