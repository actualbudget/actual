import React from 'react';
import { useSelector } from 'react-redux';

import { useActions } from '../hooks/useActions';
import Close from '../icons/v1/Close';
import { theme } from '../style';

import Button from './common/Button';
import LinkButton from './common/LinkButton';
import Text from './common/Text';
import View from './common/View';

function closeNotification(setAppState) {
  // Set a flag to never show an update notification again for this session
  setAppState({
    updateInfo: null,
    showUpdateNotification: false,
  });
}

export default function UpdateNotification() {
  let updateInfo = useSelector(state => state.app.updateInfo);
  let showUpdateNotification = useSelector(
    state => state.app.showUpdateNotification,
  );

  let { updateApp, setAppState } = useActions();

  if (updateInfo && showUpdateNotification) {
    let notes = updateInfo.releaseNotes;

    return (
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          margin: '15px 17px',
          backgroundColor: theme.altPageTextPositive,
          color: theme.tableBackground,
          padding: '7px 10px',
          borderRadius: 4,
          zIndex: 10000,
          maxWidth: 450,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ marginRight: 10, fontWeight: 700 }}>
            <Text>App updated to {updateInfo.version}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ marginTop: -1 }}>
            <Text>
              <LinkButton
                onClick={updateApp}
                style={{
                  color: theme.buttonPrimaryText,
                  textDecoration: 'underline',
                }}
              >
                Restart
              </LinkButton>{' '}
              (
              <LinkButton
                style={{
                  color: theme.buttonPrimaryText,
                  textDecoration: 'underline',
                }}
                onClick={() =>
                  window.Actual.openURLInBrowser(
                    'https://actualbudget.org/docs/releases',
                  )
                }
              >
                notes
              </LinkButton>
              )
              <Button
                type="bare"
                style={{ display: 'inline', padding: '1px 7px 2px 7px' }}
                onClick={() => closeNotification(setAppState)}
              >
                <Close width={9} style={{ color: theme.buttonPrimaryText }} />
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
