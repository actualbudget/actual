import React, { useCallback, useEffect, useState } from 'react';

import { Button } from '@actual-app/components/button';
import { SvgPencil1 } from '@actual-app/components/icons/v2';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

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
          onEnter={onSaveValue}
          onUpdate={onSaveValue}
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
