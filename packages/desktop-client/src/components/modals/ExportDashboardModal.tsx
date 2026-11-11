import { useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { SvgCode, SvgPhoto, SvgPrinter } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import type { DashboardExportFormat } from '#components/reports/dashboardExport';
import type { Modal as ModalType } from '#modals/modalsSlice';

type ExportDashboardModalProps = Extract<
  ModalType,
  { name: 'export-dashboard' }
>['options'];

type ExportOption = {
  format: DashboardExportFormat;
  title: string;
  description: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export function ExportDashboardModal({
  dashboardName,
  onExport,
}: ExportDashboardModalProps) {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState<DashboardExportFormat | null>(
    null,
  );

  const options: ExportOption[] = [
    {
      format: 'pdf',
      title: t('PDF document'),
      description: t(
        'A printable version of this dashboard: a title and date followed by your widgets laid out as on screen, spread over as many pages as needed.',
      ),
      Icon: SvgPrinter,
    },
    {
      format: 'png',
      title: t('PNG image'),
      description: t(
        'A single image of the whole dashboard, handy for sharing or pasting into documents.',
      ),
      Icon: SvgPhoto,
    },
    {
      format: 'json',
      title: t('JSON file'),
      description: t(
        'The dashboard layout and widget settings. Import it into another dashboard or budget to recreate this one.',
      ),
      Icon: SvgCode,
    },
  ];

  return (
    <Modal
      name="export-dashboard"
      containerProps={{ style: { width: 520 } }}
      isDismissable={exporting === null}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Export dashboard')}
            rightContent={
              <ModalCloseButton
                onPress={() => state.close()}
                style={exporting ? { visibility: 'hidden' } : undefined}
              />
            }
          />

          <View style={{ gap: 10, lineHeight: 1.5 }}>
            <Text style={{ color: theme.pageTextLight }}>
              {t('Choose how to download the dashboard "{{dashboardName}}".', {
                dashboardName,
              })}
            </Text>

            <View style={{ gap: 8 }}>
              {options.map(({ format, title, description, Icon }) => {
                const isExportingThis = exporting === format;
                return (
                  <Button
                    key={format}
                    variant="normal"
                    isDisabled={exporting !== null}
                    data-testid={`export-dashboard-${format}`}
                    onPress={async () => {
                      setExporting(format);
                      try {
                        await onExport(format);
                        state.close();
                      } catch (error) {
                        console.error('Dashboard export failed:', error);
                      } finally {
                        setExporting(null);
                      }
                    }}
                    style={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      padding: '12px 14px',
                      gap: 14,
                      whiteSpace: 'normal',
                      alignItems: 'center',
                    }}
                  >
                    <View
                      aria-hidden
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        flexShrink: 0,
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: theme.pageTextPositive,
                        backgroundColor: theme.tableRowHeaderBackground,
                      }}
                    >
                      {isExportingThis ? (
                        <AnimatedLoading style={{ width: 16, height: 16 }} />
                      ) : (
                        <Icon style={{ width: 16, height: 16 }} />
                      )}
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text style={{ fontWeight: 600, fontSize: 14 }}>
                        {title}
                      </Text>
                      <Text
                        style={{
                          ...styles.smallText,
                          color: theme.pageTextLight,
                        }}
                      >
                        {isExportingThis
                          ? t('Preparing your download…')
                          : description}
                      </Text>
                    </View>
                  </Button>
                );
              })}
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                marginTop: 5,
              }}
            >
              <Button
                onPress={() => state.close()}
                isDisabled={exporting !== null}
              >
                <Trans>Cancel</Trans>
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
