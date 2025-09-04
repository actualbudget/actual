import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type PluginWidget } from 'loot-core/types/models';

import { RenderPluginsComponent } from '@desktop-client/components/plugins/RenderPluginsComponent';
import { ReportCard } from '@desktop-client/components/reports/ReportCard';
import { useActualPlugins } from '@desktop-client/plugin/ActualPluginsProvider';

type PluginCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: PluginWidget['meta'];
  onMetaChange: (newMeta: PluginWidget['meta']) => void;
  onRemove: () => void;
};

class PluginWidgetErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Plugin widget error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function PluginWidgetFallback({
  reason,
  isEditing,
  onRemove,
  meta,
}: {
  reason: 'not-found' | 'error' | 'loading-failed';
  isEditing?: boolean;
  onRemove: () => void;
  meta?: PluginWidget['meta'];
}) {
  const { t } = useTranslation();

  const getErrorMessage = () => {
    switch (reason) {
      case 'not-found':
        return t('Plugin widget not found');
      case 'error':
        return t('Plugin widget error occurred');
      case 'loading-failed':
        return t('Plugin failed to load');
      default:
        return t('Plugin widget unavailable');
    }
  };

  const getErrorDetails = () => {
    switch (reason) {
      case 'not-found':
        return meta?.pluginId
          ? t(
              'Plugin ‘{{pluginId}}’ widget ‘{{widgetType}}’ is not available',
              {
                pluginId: meta.pluginId,
                widgetType: meta.pluginWidgetType || 'unknown',
              },
            )
          : t('Widget configuration is invalid');
      case 'error':
        return t(
          'The plugin widget encountered an error and cannot be displayed',
        );
      case 'loading-failed':
        return t(
          'The plugin could not be loaded. It may be disabled or have an error.',
        );
      default:
        return t('This widget cannot be displayed');
    }
  };

  return (
    <ReportCard
      isEditing={isEditing}
      menuItems={[
        {
          name: 'remove',
          text: t('Remove'),
        },
      ]}
      onMenuSelect={item => {
        switch (item) {
          case 'remove':
            onRemove();
            break;
          default:
            console.warn(`Unrecognized menu selection: ${item}`);
            break;
        }
      }}
    >
      <View
        style={{
          flex: 1,
          padding: 20,
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: theme.errorText,
            marginBottom: 8,
          }}
        >
          {getErrorMessage()}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: theme.pageTextSubdued,
            lineHeight: 1.4,
          }}
        >
          {getErrorDetails()}
        </Text>
        {isEditing && (
          <Text
            style={{
              fontSize: 11,
              color: theme.pageTextSubdued,
              marginTop: 12,
              fontStyle: 'italic',
            }}
          >
            <Trans>You can remove this widget using the menu</Trans>
          </Text>
        )}
      </View>
    </ReportCard>
  );
}

export function PluginCard({
  widgetId,
  isEditing,
  meta = { pluginId: '', pluginWidgetType: '' },
  onRemove,
}: PluginCardProps) {
  const { t } = useTranslation();
  const { pluginRegisteredWidgets } = useActualPlugins();
  // const [nameMenuOpen, setNameMenuOpen] = useState(false);

  // Validate meta data
  if (!meta?.pluginId || !meta?.pluginWidgetType) {
    return (
      <PluginWidgetFallback
        reason="not-found"
        isEditing={isEditing}
        onRemove={onRemove}
        meta={meta}
      />
    );
  }

  const widgetKey = `${meta.pluginId}_${meta.pluginWidgetType}`;
  const pluginWidget = pluginRegisteredWidgets.get(widgetKey);

  if (!pluginWidget) {
    return (
      <PluginWidgetFallback
        reason="not-found"
        isEditing={isEditing}
        onRemove={onRemove}
        meta={meta}
      />
    );
  }

  const errorFallback = (
    <PluginWidgetFallback
      reason="error"
      isEditing={isEditing}
      onRemove={onRemove}
      meta={meta}
    />
  );

  return (
    <ReportCard
      isEditing={isEditing}
      // disableClick={nameMenuOpen}
      menuItems={[
        {
          name: 'remove',
          text: t('Remove'),
        },
      ]}
      onMenuSelect={item => {
        switch (item) {
          case 'remove':
            onRemove();
            break;
          default:
            console.warn(`Unrecognized menu selection: ${item}`);
            break;
        }
      }}
    >
      <PluginWidgetErrorBoundary fallback={errorFallback}>
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <RenderPluginsComponent
            toRender={new Map([[widgetId, pluginWidget.renderWidget]])}
          />
        </View>
      </PluginWidgetErrorBoundary>
    </ReportCard>
  );
}
