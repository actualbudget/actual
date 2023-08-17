import React, { Component, type ComponentType, type ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback: ComponentType<{ error: Error }>;
};

type ErrorBoundaryState = {
  error?: Error;
};

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const { fallback: FallbackComponent } = this.props;
      return <FallbackComponent error={this.state.error} />;
    }
    return this.props.children;
  }
}
