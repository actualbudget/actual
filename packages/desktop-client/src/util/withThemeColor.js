import React from 'react';

export const withThemeColor = color => WrappedComponent => {
  class WithThemeColor extends React.Component {
    componentDidMount() {
      setThemeColor(color);
    }

    componentDidUpdate() {
      setThemeColor(color);
    }

    render() {
      return <WrappedComponent {...this.props} />;
    }
  }
  return WithThemeColor;
};

export function setThemeColor(color) {
  const metaTags = document.getElementsByTagName('meta');
  const themeTag = [...metaTags].find(tag => tag.name === 'theme-color');
  themeTag.setAttribute('content', color);
}
