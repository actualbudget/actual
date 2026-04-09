import type { RefObject } from 'react';

import { Button } from '@actual-app/components/button';
import { ColorPicker } from '@actual-app/components/color-picker';
import type { TagEntity } from '@actual-app/core/types/models';

import { useTagCSS } from '#hooks/useTagCSS';
import { useUpdateTagMutation } from '#tags';

type TagEditorProps = {
  tag: TagEntity;
  ref: RefObject<HTMLButtonElement | null>;
};

export const TagEditor = ({ tag, ref }: TagEditorProps) => {
  const getTagCSS = useTagCSS();
  const { mutate: updateTag } = useUpdateTagMutation();

  const formattedTag = <>#{tag.tag}</>;

  return (
    <ColorPicker
      value={tag.color ?? undefined}
      onChange={color => {
        updateTag({ tag: { ...tag, color: color.toString('hex') } });
      }}
    >
      <Button variant="bare" className={getTagCSS(tag.tag)} ref={ref}>
        {formattedTag}
      </Button>
    </ColorPicker>
  );
};
