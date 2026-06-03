import { Component, useCallback, useEffect, useRef, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { useFeatureFlag } from '#hooks/useFeatureFlag';
import type { PluginSlotRegistrationFn } from '#plugin/core/pluginLoader';

type RenderPluginsComponentProps = {
  toRender: Map<string, PluginSlotRegistrationFn>;
};

type PluginErrorBoundaryProps = {
  children: ReactNode;
  pluginKey: string;
  onError: (pluginKey: string, error: unknown) => void;
};

type PluginErrorBoundaryState = {
  error: unknown;
  hasError: boolean;
};

class PluginErrorBoundary extends Component<
  PluginErrorBoundaryProps,
  PluginErrorBoundaryState
> {
  state: PluginErrorBoundaryState = { error: null, hasError: false };

  static getDerivedStateFromError(error: unknown) {
    return { error, hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error('[plugins] Plugin render failed', {
      pluginKey: this.props.pluginKey,
      error,
      componentStack: errorInfo.componentStack,
    });
    this.props.onError(this.props.pluginKey, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <PluginErrorNotice
          error={this.state.error}
          pluginKey={this.props.pluginKey}
        />
      );
    }

    return this.props.children;
  }
}

function PluginErrorNotice({
  error,
  pluginKey,
}: {
  error: unknown;
  pluginKey: string;
}) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    <div
      role="alert"
      style={{
        border: '1px solid #d97c7c',
        borderRadius: 4,
        color: '#8a1f1f',
        margin: 12,
        padding: 12,
      }}
    >
      <div style={{ fontWeight: 600 }}>
        <Trans>Plugin failed to render</Trans>
      </div>
      <div style={{ fontSize: 12, marginTop: 4 }}>{pluginKey}</div>
      <pre style={{ fontSize: 12, margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>
        {message}
      </pre>
    </div>
  );
}

export function RenderPluginsComponent({
  toRender,
}: RenderPluginsComponentProps) {
  const pluginRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pluginsEnabled = useFeatureFlag('plugins');
  const [pluginErrors, setPluginErrors] = useState<Record<string, unknown>>({});

  const onPluginError = useCallback((pluginKey: string, error: unknown) => {
    setPluginErrors(errors => ({ ...errors, [pluginKey]: error }));
  }, []);

  useEffect(() => {
    if (!pluginsEnabled) return;

    const cleanups: Array<{
      pluginKey: string;
      cleanup: void | (() => void);
    }> = [];

    [...toRender.entries()].forEach(([pluginKey, plugin], index) => {
      const pluginRef = pluginRefs.current[index];
      if (pluginRef) {
        try {
          const cleanup = plugin(pluginRef);
          cleanups.push({ pluginKey, cleanup });
        } catch (error) {
          console.error('[plugins] Plugin mount failed', {
            pluginKey,
            error,
          });
          onPluginError(pluginKey, error);
        }
      }
    });

    return () => {
      cleanups.forEach(({ pluginKey, cleanup }) => {
        if (typeof cleanup === 'function') {
          try {
            cleanup();
          } catch (error) {
            console.error('[plugins] Plugin cleanup failed', {
              pluginKey,
              error,
            });
          }
        }
      });
    };
  }, [onPluginError, toRender, pluginsEnabled]);

  return (
    pluginsEnabled && (
      <>
        {[...toRender.entries()].map(([key], index) => (
          <PluginErrorBoundary
            key={key}
            pluginKey={key}
            onError={onPluginError}
          >
            {pluginErrors[key] ? null : (
              <div
                ref={el => {
                  pluginRefs.current[index] = el;
                }}
              />
            )}
          </PluginErrorBoundary>
        ))}
      </>
    )
  );
}
