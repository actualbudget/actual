import React from 'react';
import { Text, View, Image, StatusBar } from 'react-native';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  SafeAreaProvider,
  initialWindowMetrics
} from 'react-native-safe-area-context';
import * as actions from 'loot-core/src/client/actions';
import { send } from 'loot-core/src/platform/client/fetch';
import { colors } from 'loot-design/src/style';
import AnimatedLoading from 'loot-design/src/svg/v1/AnimatedLoading';
import ManagementApp from './manager/ManagementApp';
import FinancesApp from './FinancesApp';
import logo from '../../assets/logo.png';

class App extends React.Component {
  state = { initializing: true };

  async componentDidMount() {
    // Load any global prefs
    let globalPrefs = await this.props.loadGlobalPrefs();

    if (global.SentryClient) {
      if (globalPrefs.userId) {
        global.SentryClient.setUser({
          id: globalPrefs.userId,
          ip_address: '{{auto}}'
        });
      } else {
        // For some reason, we need to do this for mobile. We don't need to do
        // this on desktop, so there must be a slight difference (or bug) in the
        // SDK
        global.SentryClient.setUser({
          ip_address: '{{auto}}'
        });
      }
    }

    const budgetId = await send('get-last-opened-backup');
    if (budgetId) {
      await this.props.loadBudget(budgetId);
    }

    this.setState({ initializing: false });
  }

  render() {
    let { loadingText } = this.props;
    let { initializing } = this.state;

    let content;
    let showBackground = true;
    if (!initializing) {
      if (!this.props.budgetId) {
        content = <ManagementApp />;
      } else {
        content = <FinancesApp />;
        showBackground = false;
      }
    }

    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <View style={{ flex: 1 }}>
          <StatusBar translucent backgroundColor="transparent" />
          {showBackground && (
            <>
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: colors.n3,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                {(initializing || loadingText != null) && (
                  <Image style={{ width: 64, height: 64 }} source={logo} />
                )}
              </View>

              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                {(initializing || loadingText != null) && (
                  <View style={{ paddingTop: 125, alignItems: 'center' }}>
                    {loadingText !== '' && loadingText !== null && (
                      <Text
                        style={{
                          color: 'white',
                          fontSize: 16,
                          marginVertical: 10
                        }}
                      >
                        {loadingText}
                      </Text>
                    )}
                    <AnimatedLoading width={30} height={30} color="white" />
                  </View>
                )}
              </View>
            </>
          )}
          {content}
        </View>
      </SafeAreaProvider>
    );
  }
}

export default connect(
  state => ({
    budgetId: state.prefs.local && state.prefs.local.id,
    loadingText: state.app.loadingText
  }),
  dispatch => bindActionCreators(actions, dispatch)
)(App);
