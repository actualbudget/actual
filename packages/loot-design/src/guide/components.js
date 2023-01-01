import React from 'react';

import { css } from 'glamor';

export function Section({
  children,
  style,
  contentStyle,
  direction = 'vertical'
}) {
  const arr = React.Children.toArray(children);

  const items = [];
  let i = 0;
  while (i < arr.length) {
    if (typeof arr[i] !== 'string') {
      items.push(arr[i]);
      i++;
    } else {
      items.push([arr[i], arr[i + 1]]);
      i += 2;
    }
  }

  const margin = direction === 'horizontal' ? '0 15px' : '15px 0';

  return (
    <div
      {...css(
        {
          display: 'flex',
          flexDirection: direction === 'horizontal' ? 'row' : 'column'
        },
        style
      )}
      data-section="true"
    >
      {items.map((item, i) => {
        return Array.isArray(item) ? (
          <div style={{ margin }} key={i}>
            <div style={{ color: '#a0a0a0', fontSize: 10, marginBottom: 5 }}>
              {item[0]}
            </div>

            <div {...css(contentStyle)}>{item[1]}</div>
          </div>
        ) : (
          <div {...css({ margin }, contentStyle)} key={i}>
            {item}
          </div>
        );
      })}
    </div>
  );
}

export function MobileSection({ style, headerComponent, children }) {
  return (
    <Section
      contentStyle={[
        {
          width: 375,
          height: 667,
          border: '1px solid #f0f0f0',
          overflow: 'hidden',
          display: 'flex',
          backgroundColor: '#fafafa'
        },
        style
      ]}
    >
      {children}
    </Section>
  );
}

export function WithHeader({ title, style, children }) {
  return (
    <div
      {...css([
        {
          flex: 1,
          fontSize: 14,
          fontWeight: 500,
          color: '#303030'
        },
        style
      ])}
    >
      <div {...css({ textAlign: 'center', paddingTop: 10, paddingBottom: 5 })}>
        {title}
      </div>
      {children}
    </div>
  );
}

export function MobileScreen({ children }) {
  return (
    <div
      style={{
        width: 375,
        height: 667,
        overflow: 'hidden',
        display: 'flex'
      }}
    >
      {children}
    </div>
  );
}

export function Note({ top, left, width, children }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: top || 0,
        left: left || 0,
        width: width,
        backgroundColor: '#fff971',
        padding: 5,
        fontSize: 12,
        fontStyle: 'italic'
      }}
    >
      {children}
    </div>
  );
}

export class TestModal extends React.Component {
  state = { parentNode: null };

  componentDidMount() {
    this.setState({ parentNode: this.parent });
  }

  render() {
    const { children, backgroundColor, width = 800, height = 500 } = this.props;
    const { parentNode } = this.state;

    return [
      <div
        key="parent"
        ref={el => (this.parent = el)}
        style={{
          width,
          height,
          position: 'relative',
          backgroundColor: backgroundColor || '#f0f0f0'
        }}
      />,
      parentNode && children(parentNode)
    ];
  }
}

export function Component({ children }) {
  return children();
}
