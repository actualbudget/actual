import React, { Component } from 'react';

export let withThemeColor = color => WrappedComponent => {
  class WithThemeColor extends Component {
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
  let metaTags = document.getElementsByTagName('meta');
  let themeTag = [...metaTags].find(tag => tag.name === 'theme-color');
  themeTag.setAttribute('content', color);
}
