import {
  useState,
  useRef,
  useCallback,
  useMemo,
  Suspense,
  lazy,
  type ChangeEvent,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import { type FormulaWidget } from 'loot-core/types/models';

import { EditablePageHeaderTitle } from '@desktop-client/components/EditablePageHeaderTitle';
import { QueryManager } from '@desktop-client/components/formula/QueryManager';
import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import {
  MobilePageHeader,
  Page,
  PageHeader,
} from '@desktop-client/components/Page';
import { FormulaResult } from '@desktop-client/components/reports/FormulaResult';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { useFormulaExecution } from '@desktop-client/hooks/useFormulaExecution';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useThemeColors } from '@desktop-client/hooks/useThemeColors';
import { useWidget } from '@desktop-client/hooks/useWidget';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

const FormulaEditor = lazy(() =>
  import('../../formula/FormulaEditor').then(module => ({
    default: module.FormulaEditor,
  })),
);

export function Formula() {
  const params = useParams();
  const { data: widget, isLoading } = useWidget<FormulaWidget>(
    params.id ?? '',
    'formula-card',
  );

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return <FormulaInner widget={widget} />;
}

type FormulaInnerProps = {
  widget?: FormulaWidget;
};

function FormulaInner({ widget }: FormulaInnerProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();
  const themeColors = useThemeColors();

  const queriesRef = useRef(widget?.meta?.queries || {});
  const [queriesVersion, setQueriesVersion] = useState(0);

  const [formula, setFormula] = useState(
    widget?.meta?.formula || '=SUM(1, 2, 3)',
  );

  const [fontSizeMode, setFontSizeMode] = useState<'dynamic' | 'static'>(
    widget?.meta?.fontSizeMode || 'dynamic',
  );
  const [staticFontSize, setStaticFontSize] = useState<number>(
    widget?.meta?.staticFontSize || 32,
  );
  const [colorFormula, setColorFormula] = useState(
    widget?.meta?.colorFormula || '',
  );

  const title = widget?.meta?.name || t('Formula');

  const {
    result,
    isLoading: isExecuting,
    error,
  } = useFormulaExecution(formula, queriesRef.current, queriesVersion);

  const colorVariables = useMemo(
    () => ({
      RESULT: result ?? 0,
      ...Object.entries(themeColors).reduce(
        (acc, [key, value]) => {
          acc[`theme_${key}`] = value;
          return acc;
        },
        {} as Record<string, string>,
      ),
    }),
    [result, themeColors],
  );
  const { result: colorResult, error: colorError } = useFormulaExecution(
    colorFormula,
    queriesRef.current,
    queriesVersion,
    colorVariables,
  );

  const handleQueriesChange = useCallback(
    (newQueries: typeof queriesRef.current) => {
      queriesRef.current = newQueries;
      setQueriesVersion(v => v + 1);
    },
    [],
  );

  const onSaveWidgetName = async (newName: string) => {
    if (!widget) {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('Cannot save: No widget available.'),
          },
        }),
      );
      return;
    }

    const name = newName || t('Formula');
    await send('dashboard-update-widget', {
      id: widget.id,
      meta: {
        ...(widget.meta ?? {}),
        name,
        formula,
        queries: queriesRef.current,
        fontSizeMode,
        staticFontSize,
        colorFormula,
      },
    });
  };

  async function onSaveWidget() {
    if (!widget) {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('Cannot save: No widget available.'),
          },
        }),
      );
      return;
    }

    await send('dashboard-update-widget', {
      id: widget.id,
      meta: {
        ...(widget.meta ?? {}),
        formula,
        queries: queriesRef.current,
        fontSizeMode,
        staticFontSize,
        colorFormula,
      },
    });

    dispatch(
      addNotification({
        notification: {
          type: 'message',
          message: t('Dashboard widget successfully saved.'),
        },
      }),
    );
  }

  // Determine the custom color from color formula result
  const customColor =
    colorFormula && !colorError && colorResult ? String(colorResult) : null;

  return (
    <Page
      header={
        isNarrowWidth ? (
          <MobilePageHeader
            title={title}
            leftContent={
              <MobileBackButton onPress={() => navigate('/reports')} />
            }
          />
        ) : (
          <PageHeader
            title={
              widget ? (
                <EditablePageHeaderTitle
                  title={title}
                  onSave={onSaveWidgetName}
                />
              ) : (
                title
              )
            }
          />
        )
      }
      padding={0}
    >
      {widget && (
        <View
          style={{
            padding: 20,
            display: 'flex',
            justifyContent: 'flex-end',
            flexDirection: 'row',
            background: theme.pageBackground,
          }}
        >
          <Button
            variant="primary"
            onPress={onSaveWidget}
            style={{ width: 100 }}
          >
            <Trans>Save widget</Trans>
          </Button>
        </View>
      )}
      <View
        style={{
          width: '100%',
          height: '100%',
          background: theme.pageBackground,
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        <View
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <View
            style={{
              padding: 20,
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 10,
              minHeight: 120,
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: theme.pageTextSubdued,
              }}
            >
              <Trans>Result:</Trans>
            </div>
            <View
              style={{
                height: 120,
                width: '100%',
                overflow: 'auto',
                backgroundColor: theme.cardBackground,
                borderRadius: 6,
                ...styles.horizontalScrollbar,
                '::-webkit-scrollbar': {
                  height: '8px',
                },
              }}
            >
              <FormulaResult
                value={result}
                error={error}
                loading={isExecuting}
                fontSizeMode={fontSizeMode}
                staticFontSize={staticFontSize}
                customColor={customColor}
              />
            </View>
          </View>

          <View
            style={{
              flex: 1,
              minHeight: 50,
              margin: 20,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: theme.pageTextSubdued,
                marginBottom: 5,
              }}
            >
              <Trans>Formula:</Trans>
            </div>
            <Suspense fallback={<div style={{ padding: 10 }}>Loading...</div>}>
              <FormulaEditor
                value={formula}
                onChange={setFormula}
                mode="query"
                queries={queriesRef.current}
                singleLine={false}
                showLineNumbers={true}
              />
            </Suspense>
          </View>

          <View
            style={{
              padding: '0 20px 20px 20px',
              display: 'flex',
              flexDirection: 'row',
              gap: 20,
              alignItems: 'flex-end',
            }}
          >
            <View>
              <div
                style={{
                  fontSize: 13,
                  color: theme.pageTextSubdued,
                  marginBottom: 5,
                }}
              >
                <Trans>Font size:</Trans>
              </div>
              <Select
                value={fontSizeMode}
                onChange={(value: 'dynamic' | 'static') =>
                  setFontSizeMode(value)
                }
                options={[
                  ['dynamic', t('Dynamic')],
                  ['static', t('Static')],
                ]}
              />
            </View>

            {fontSizeMode === 'static' && (
              <View>
                <div
                  style={{
                    fontSize: 13,
                    color: theme.pageTextSubdued,
                    marginBottom: 5,
                  }}
                >
                  <Trans>Font size (px):</Trans>
                </div>
                <Input
                  type="number"
                  value={String(staticFontSize)}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setStaticFontSize(Number(e.target.value))
                  }
                />
              </View>
            )}
          </View>

          <View
            style={{
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: theme.pageTextSubdued,
                marginBottom: 5,
              }}
            >
              <Trans>Conditional color (optional):</Trans>
            </div>
            <View
              style={{
                border: `1px solid ${theme.formInputBorder}`,
                borderRadius: 4,
                overflow: 'hidden',
                backgroundColor: theme.tableBackground,
              }}
            >
              <Suspense fallback={<div style={{ height: 32 }} />}>
                <FormulaEditor
                  value={colorFormula}
                  variables={colorVariables}
                  onChange={setColorFormula}
                  mode="query"
                  queries={queriesRef.current}
                  singleLine={true}
                  showLineNumbers={false}
                />
              </Suspense>
            </View>
            <div
              style={{
                fontSize: 11,
                color: theme.pageTextSubdued,
                marginTop: 5,
              }}
            >
              <Trans>
                Formula that returns a color (e.g., &ldquo;red&rdquo;,
                &ldquo;#ff0000&rdquo;). Leave blank for default. Use RESULT
                variable to access the main formula result.
              </Trans>
            </div>
          </View>
        </View>

        <View
          style={{
            overflowY: 'auto',
          }}
        >
          <QueryManager
            queries={queriesRef.current}
            onQueriesChange={handleQueriesChange}
          />
        </View>
      </View>
    </Page>
  );
}
