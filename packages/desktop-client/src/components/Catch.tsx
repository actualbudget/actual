import {
  Component,
  type ReactNode,
  type ComponentType,
  type ErrorInfo,
} from 'react';

type ErrorHandler = (error: Error, info: ErrorInfo) => void;
type ErrorHandlingComponent<Props> = (props: Props, error?: Error) => ReactNode;

type ErrorState = { error?: Error };

export default function Catch<Props>(
  component: ErrorHandlingComponent<Props>,
  errorHandler?: ErrorHandler,
): ComponentType<Props> {
  return class extends Component<Props, ErrorState> {
    state: ErrorState = {
      error: undefined,
    };

    static getDerivedStateFromError(error: Error) {
      return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
      if (errorHandler) {
        errorHandler(error, info);
      }
    }

    render() {
      return component(this.props, this.state.error);
    }
  };
}
