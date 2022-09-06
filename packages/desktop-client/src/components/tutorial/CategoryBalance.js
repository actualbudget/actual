import React from 'react';

import { P, Button } from 'loot-design/src/components/common';

import { Standalone, Title, useMinimized } from './common';
import Navigation from './Navigation';

function CategoryBalance({ targetRect, navigationProps }) {
  let [minimized, toggle] = useMinimized();

  return (
    <Standalone>
      <Title>Tracking categories</Title>
      {!minimized && (
        <P isLast={true}>
          If you categorized any expenses, the budget has updated to show the
          amount spent in those categories and the new balance.
        </P>
      )}
      <Navigation
        {...navigationProps}
        leftContent={
          <Button bare onClick={toggle}>
            {minimized ? 'Show more' : 'Show less'}
          </Button>
        }
      />
    </Standalone>
  );
}

export default CategoryBalance;
