import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { ColorPicker } from '@actual-app/components/color-picker';

import { type Tag } from 'loot-core/types/models';

import { createTag, updateTag } from '@desktop-client/queries/queriesSlice';
import { useDispatch } from '@desktop-client/redux';
import { useTagCSS } from '@desktop-client/style/tags';

type TagEditorProps = {
  tag: Tag;
};

export const TagEditor = ({ tag }: TagEditorProps) => {
  const getTagCSS = useTagCSS();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const formattedTag = <>#{tag.tag === '*' ? t('Default') : tag.tag}</>;

  return (
    <ColorPicker
      value={tag.color}
      onChange={color => {
        dispatch(
          tag.id
            ? updateTag({ ...tag, color: color.toString('hex') })
            : createTag({
                tag: tag.tag,
                color: color.toString('hex'),
              }),
        );
      }}
    >
      <Button variant="bare" className={getTagCSS(tag.tag)}>
        {formattedTag}
      </Button>
    </ColorPicker>
  );
};
