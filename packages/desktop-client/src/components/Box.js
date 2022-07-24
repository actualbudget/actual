import React from 'react';

function getFlex(flex) {
  flex = flex != null ? flex : 1;
  if (typeof flex === 'number') {
    return flex + ' 0 auto';
  }
  return flex;
}

function Box({ flex, children, direction, style }) {
  return (
    <div
      style={{
        ...style,
        flex: getFlex(flex),
        display: 'flex',
        flexDirection: direction || 'column'
      }}
    >
      {children}
    </div>
  );
}

export default Box;
