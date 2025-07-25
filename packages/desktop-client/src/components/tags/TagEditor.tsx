import { type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { ColorPicker } from '@actual-app/components/color-picker';

import { type Tag } from 'loot-core/types/models';

import { createTag, updateTag } from '@desktop-client/queries/queriesSlice';
import { useDispatch } from '@desktop-client/redux';
import { useTagCSS } from '@desktop-client/style/tags';

type TagEditorProps = {
  tag: Tag;
  ref: RefObject<HTMLButtonElement | null>;
};

export const TagEditor = ({ tag, ref }: TagEditorProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const getTagCSS = useTagCSS();

  const formattedTag = <>#{tag.tag === '*' ? t('Default') : tag.tag}</>;

  return (
    <ColorPicker
      value={tag.color}
      onChange={color => {
        dispatch(
          tag.id !== 'dummy-tag'
            ? updateTag({ ...tag, color: color.toString('hex') })
            : createTag({
                tag: tag.tag,
                color: color.toString('hex'),
                description: tag.description,
              }),
        );
      }}
    >
      <Button variant="bare" className={getTagCSS(tag.tag)} ref={ref}>
        {formattedTag}
      </Button>
    </ColorPicker>
  );
};
