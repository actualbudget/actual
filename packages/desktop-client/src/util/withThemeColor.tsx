import React, { Component } from 'react';

/** @deprecated use `useSetThemeColor` instead */
export const withThemeColor = (color: string) => WrappedComponent => {
  class WithThemeColor extends Component {
    static displayName = `withThemeColor(${
      WrappedComponent.displayName || WrappedComponent.name
    })`;

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

export function setThemeColor(color: string) {
  const metaTags = document.getElementsByTagName('meta');
  const themeTag = [...metaTags].find(tag => tag.name === 'theme-color');
  themeTag.setAttribute('content', color);
}
