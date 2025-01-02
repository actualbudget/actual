import React from 'react';
import { useTranslation } from 'react-i18next';

import { setAppState, updateApp } from 'loot-core/client/actions';

import { SvgClose } from '../icons/v1';
import { useSelector, useDispatch } from '../redux';
import { theme } from '../style';

import { Button } from './common/Button2';
import { Link } from './common/Link';
import { Text } from './common/Text';
import { View } from './common/View';

export function UpdateNotification() {
  const { t } = useTranslation();
  const updateInfo = useSelector(state => state.app.updateInfo);
  const showUpdateNotification = useSelector(
    state => state.app.showUpdateNotification,
  );

  const dispatch = useDispatch();
  const onRestart = () => {
    dispatch(updateApp());
  };

  if (updateInfo && showUpdateNotification) {
    const notes = updateInfo.releaseNotes;

    return (
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          margin: '15px 17px',
          backgroundColor: theme.pageTextPositive,
          color: theme.tableBackground,
          padding: '7px 10px',
          borderRadius: 4,
          zIndex: 10000,
          maxWidth: 450,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ marginRight: 10, fontWeight: 700 }}>
            <Text>
              {t('App updated to {{version}}', { version: updateInfo.version })}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ marginTop: -1 }}>
            <Text>
              <Link
                variant="text"
                onClick={onRestart}
                style={{
                  color: theme.buttonPrimaryText,
                  textDecoration: 'underline',
                }}
              >
                {t('Restart')}
              </Link>{' '}
              (
              <Link
                variant="text"
                style={{
                  color: theme.buttonPrimaryText,
                  textDecoration: 'underline',
                }}
                onClick={() =>
                  window.Actual?.openURLInBrowser(
                    'https://actualbudget.org/docs/releases',
                  )
                }
              >
                {t('notes')}
              </Link>
              )
              <Button
                variant="bare"
                aria-label={t('Close')}
                style={{ display: 'inline', padding: '1px 7px 2px 7px' }}
                onPress={() => {
                  // Set a flag to never show an update notification again for this session
                  dispatch(
                    setAppState({
                      updateInfo: null,
                      showUpdateNotification: false,
                    }),
                  );
                }}
              >
                <SvgClose
                  width={9}
                  style={{ color: theme.buttonPrimaryText }}
                />
              </Button>
            </Text>
          </View>
        </View>
        {notes && (
          <View style={{ marginTop: 10, fontWeight: 500 }}>{notes}</View>
        )}
      </View>
    );
  }

  return null;
}
