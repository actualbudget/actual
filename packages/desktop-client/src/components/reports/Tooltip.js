import React from 'react';
import ReactDOM from 'react-dom';

import { css, before } from 'glamor';
import { VictoryTooltip } from 'victory';

import { colors } from 'loot-design/src/style';

class Tooltip extends React.Component {
  static defaultEvents = VictoryTooltip.defaultEvents;

  render() {
    let {
      active,
      x,
      y,
      scale,
      datum,
      portalHost,
      offsetX = 0,
      offsetY,
      position,
      light,
      forceActive,
      style
    } = this.props;
    const xRange = scale.x.range();
    const xPos = x - xRange[0];

    if (!position) {
      if (datum.labelPosition) {
        position = datum.labelPosition;
      } else {
        position = xPos < 150 ? 'right' : 'left';
      }
    }

    if (!portalHost || (!active && !forceActive)) {
      return null;
    }

    y = offsetY ? offsetY(y) : y;

    return ReactDOM.createPortal(
      <div
        {...css(
          {
            position: 'absolute',
            top: 0,
            left: offsetX,
            // prettier-ignore
            transform: position === 'right' ?
              `translate(calc(${x}px + 15px), calc(${y}px ${light ? '' : '- 50%'}))` :
              `translate(calc(${x}px - 100% - 15px), calc(${y}px ${light ? '' : '- 50%'}))`,
            zIndex: 1000,
            pointerEvents: 'none',
            borderRadius: 2,
            boxShadow: light ? 'none' : '0 1px 6px rgba(0, 0, 0, .20)',
            // TODO: Transparent background
            backgroundColor: light ? 'transparent' : colors.n1,
            color: light ? 'inherit' : 'white',
            padding: 10
          },
          !light &&
            before({
              position: 'absolute',
              display: 'inline-block',
              borderTop: '7px solid transparent',
              borderBottom: '7px solid transparent',
              [position === 'right' ? 'borderRight' : 'borderLeft']:
                '7px solid ' + colors.n1,
              [position === 'right' ? 'left' : 'right']: -6,
              top: 'calc(50% - 7px)',
              content: '" "'
            }),
          style
        )}
      >
        {datum.premadeLabel}
      </div>,
      portalHost
    );
  }
}

export default Tooltip;
