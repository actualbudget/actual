import React, { useCallback, useEffect, useState } from 'react';

import { SvgPencil1 } from '../icons/v2';
import { theme } from '../style';

import { Button } from './common/Button2';
import { InitialFocus } from './common/InitialFocus';
import { Input } from './common/Input';
import { View } from './common/View';

type EditablePageHeaderTitleProps = {
  title: string;
  onSave: (newValue: string) => void;
};

export function EditablePageHeaderTitle({
  title: initialTitle,
  onSave,
}: EditablePageHeaderTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);

  useEffect(() => setTitle(initialTitle), [initialTitle]);

  const onSaveValue = useCallback(
    (newValue: string) => {
      onSave(newValue);
      setTitle(newValue);
      setIsEditing(false);
    },
    [onSave],
  );

  if (isEditing) {
    return (
      <InitialFocus>
        <Input
          defaultValue={title}
          onEnter={e => onSaveValue(e.currentTarget.value)}
          onBlur={e => onSaveValue(e.target.value)}
          onEscape={() => setIsEditing(false)}
          style={{
            fontSize: 25,
            fontWeight: 500,
            marginTop: -3,
            marginBottom: -3,
            marginLeft: -6,
            paddingTop: 2,
            paddingBottom: 2,
            width: Math.max(20, title.length) + 'ch',
          }}
        />
      </InitialFocus>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        '& .hover-visible': {
          opacity: 0,
          transition: 'opacity .25s',
        },
        '&:hover .hover-visible': {
          opacity: 1,
        },
      }}
    >
      {title}

      <Button
        variant="bare"
        className="hover-visible"
        onPress={() => setIsEditing(true)}
      >
        <SvgPencil1
          style={{
            width: 11,
            height: 11,
            color: theme.pageTextSubdued,
          }}
        />
      </Button>
    </View>
  );
}
