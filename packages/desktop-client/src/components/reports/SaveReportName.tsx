import React, { useEffect } from 'react';
import type { RefObject } from 'react';
import { Form } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { CustomReportEntity } from 'loot-core/types/models';

import { FormField, FormLabel } from '@desktop-client/components/forms';

type SaveReportNameProps = {
  menuItem: string;
  name: string;
  setName: (name: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  onAddUpdate: ({
    menuChoice,
    reportData,
  }: {
    menuChoice?: string;
    reportData?: CustomReportEntity;
  }) => void;
  err: string;
  report?: CustomReportEntity;
};

export function SaveReportName({
  menuItem,
  name,
  setName,
  inputRef,
  onAddUpdate,
  err,
  report,
}: SaveReportNameProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  return (
    <>
      {menuItem !== 'update-report' && (
        <Form
          onSubmit={e => {
            e.preventDefault();
            onAddUpdate({
              menuChoice: menuItem ?? undefined,
              reportData: report ?? undefined,
            });
          }}
        >
          <SpaceBetween
            style={{
              padding: 15,
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <FormField style={{ flex: 1 }}>
              <FormLabel
                title={t('Report Name')}
                htmlFor="name-field"
                style={{ userSelect: 'none' }}
              />
              <Input
                value={name}
                id="name-field"
                ref={inputRef}
                onChangeValue={setName}
                style={{ marginTop: 10 }}
              />
            </FormField>
            <Button variant="primary" type="submit" style={{ marginTop: 30 }}>
              {menuItem === 'save-report' ? t('Add') : t('Update')}
            </Button>
          </SpaceBetween>
        </Form>
      )}
      {err !== '' ? (
        <View style={{ padding: 10, alignItems: 'center' }}>
          <Text style={{ color: theme.errorText }}>{err}</Text>
        </View>
      ) : (
        <View />
      )}
    </>
  );
}
