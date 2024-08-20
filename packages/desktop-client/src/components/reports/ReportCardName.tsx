import React from 'react';

import { styles } from '../../style';
import { Block } from '../common/Block';
import { InitialFocus } from '../common/InitialFocus';
import { Input } from '../common/Input';

import { NON_DRAGGABLE_AREA_CLASS_NAME } from './constants';

type ReportCardNameProps = {
  name: string;
  isEditing: boolean;
  onChange: (newName: string) => void;
  onClose: () => void;
};

export const ReportCardName = ({
  name,
  isEditing,
  onChange,
  onClose,
}: ReportCardNameProps) => {
  if (isEditing) {
    return (
      <InitialFocus>
        <Input
          className={NON_DRAGGABLE_AREA_CLASS_NAME}
          defaultValue={name}
          onEnter={e => onChange(e.currentTarget.value)}
          onUpdate={onChange}
          onEscape={onClose}
          style={{
            fontSize: 15,
            fontWeight: 500,
            marginTop: -6,
            marginBottom: -1,
            marginLeft: -6,
            width: Math.max(20, name.length) + 'ch',
          }}
        />
      </InitialFocus>
    );
  }

  return (
    <Block
      style={{
        ...styles.mediumText,
        fontWeight: 500,
        marginBottom: 5,
      }}
      role="heading"
    >
      {name}
    </Block>
  );
};
