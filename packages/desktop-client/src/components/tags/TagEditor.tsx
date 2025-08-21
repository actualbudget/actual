import { type RefObject } from 'react';

import { Button } from '@actual-app/components/button';
import { ColorPicker } from '@actual-app/components/color-picker';

import { type TagEntity } from 'loot-core/types/models';

import { useTagCSS } from '@desktop-client/hooks/useTagCSS';
import { useDispatch } from '@desktop-client/redux';
import { updateTag } from '@desktop-client/tags/tagsSlice';

type TagEditorProps = {
  tag: TagEntity;
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
