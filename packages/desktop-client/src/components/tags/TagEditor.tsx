import { type RefObject } from 'react';

import { Button } from '@actual-app/components/button';
import { ColorPicker } from '@actual-app/components/color-picker';

import { type Tag } from 'loot-core/types/models';

import { updateTag } from '@desktop-client/queries/queriesSlice';
import { useDispatch } from '@desktop-client/redux';
import { useTagCSS } from '@desktop-client/style/tags';

type TagEditorProps = {
  tag: Tag;
  ref: RefObject<HTMLButtonElement | null>;
};

export const TagEditor = ({ tag, ref }: TagEditorProps) => {
  const dispatch = useDispatch();
  const getTagCSS = useTagCSS();

  const formattedTag = <>#{tag.tag}</>;

  return (
    <ColorPicker
      value={tag.color ?? undefined}
      onChange={color => {
        dispatch(updateTag({ ...tag, color: color.toString('hex') }));
      }}
    >
      <Button variant="bare" className={getTagCSS(tag.tag)} ref={ref}>
        {formattedTag}
      </Button>
    </ColorPicker>
  );
};
