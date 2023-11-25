import React from 'react';

import { Filter } from '../../icons/v1';
import { SettingsSliderAlternate } from '../../icons/v2';
import { theme } from '../../style';
import Button from '../common/Button';
import HoverTarget from '../common/HoverTarget';
import Text from '../common/Text';
import View from '../common/View';
import { Tooltip } from '../tooltips';

const ButtonType = cond => {
  switch (cond) {
    case 'reports':
      return <Filter width={15} height={15} />;
    default:
      return (
        <>
          <SettingsSliderAlternate
            style={{ width: 16, height: 16, marginRight: 5 }}
          />{' '}
          Filter
        </>
      );
  }
};

type FilterButtonTypeProps = {
  type: string;
  onClick: (newValue) => void;
};

function FilterButtonType({ type, onClick }: FilterButtonTypeProps) {
  return (
    <View>
      <HoverTarget
        style={{ flexShrink: 0 }}
        renderContent={() =>
          type === 'reports' && (
            <Tooltip
              position="bottom-left"
              style={{
                lineHeight: 1.5,
                padding: '6px 10px',
                backgroundColor: theme.menuAutoCompleteBackground,
                color: theme.menuAutoCompleteText,
              }}
            >
              <Text>Filters</Text>
            </Tooltip>
          )
        }
      >
        <Button
          type="bare"
          onClick={onClick}
          title={type !== 'reports' && 'Filters'}
        >
          <ButtonType cond={type} />
        </Button>
      </HoverTarget>
    </View>
  );
}

export default FilterButtonType;
