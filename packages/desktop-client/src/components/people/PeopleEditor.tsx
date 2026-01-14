import { type RefObject } from 'react';

import { Button } from '@actual-app/components/button';
import { ColorPicker } from '@actual-app/components/color-picker';

import { type TagEntity } from 'loot-core/types/models';

import { usePeopleCSS } from '@desktop-client/hooks/usePeopleCSS';
import { updatePerson } from '@desktop-client/people/peopleSlice';
import { useDispatch } from '@desktop-client/redux';

type PeopleEditorProps = {
  person: TagEntity;
  ref: RefObject<HTMLButtonElement | null>;
};

export const PeopleEditor = ({ person, ref }: PeopleEditorProps) => {
  const dispatch = useDispatch();
  const getPeopleCSS = usePeopleCSS();

  const formattedPerson = <>@{person.tag}</>;

  return (
    <ColorPicker
      value={person.color ?? undefined}
      onChange={color => {
        dispatch(updatePerson({ ...person, color: color.toString('hex') }));
      }}
    >
      <Button variant="bare" className={getPeopleCSS(person.tag)} ref={ref}>
        {formattedPerson}
      </Button>
    </ColorPicker>
  );
};
