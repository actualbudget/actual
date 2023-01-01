import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  StatusBar,
  Linking,
  Animated
} from 'react-native';
import { colors, mobileStyles as styles } from 'loot-design/src/style';
import { Button } from 'loot-design/src/components/mobile/common';
import ScalableImage from 'loot-design/src/components/mobile/ScalableImage';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as actions from 'loot-core/src/client/actions';
import TransitionView from './TransitionView';
import Icon from '../../../assets/icon.png';

function ExternalLink({ href, children }) {
  return (
    <Text
      style={{ textDecorationLine: 'underline' }}
      onPress={() => Linking.openURL(href)}
    >
      {children}
    </Text>
  );
}

function Feature({ title, subtitle }) {
  let windowDimens = Dimensions.get('window');

  return (
    <View
      style={{
        width: windowDimens.width,
        alignItems: 'center'
      }}
    >
      <View style={{ width: 335 }}>
        <Text
          style={{
            color: 'white',
            fontSize: 25,
            fontWeight: '700',
            alignSelf: 'center'
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: 'white',
            fontSize: 17,
            marginTop: 20,
            lineHeight: 25
          }}
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function SlideshowIndicator({ selected }) {
  return (
    <View
      style={{
        height: 5,
        width: 5,
        borderRadius: 5,
        backgroundColor: 'white',
        opacity: selected ? 1 : 0.4
      }}
    />
  );
}

class Intro extends React.Component {
  state = { selectedFeature: 0 };

  componentDidMount() {
    // Status bar won't change unless we do it imperatively?? When you
    // close the file it's stuck in dark mode
    StatusBar.setBarStyle('light-content');
  }

  onMomentumScrollEnd = e => {
    let x = e.nativeEvent.contentOffset.x;
    let window = Dimensions.get('window');

    let index = Math.round(x / window.width);
    this.setState({ selectedFeature: index });
  };

  render() {
    let { navigation, createBudget } = this.props;
    let { selectedFeature } = this.state;

    //let textStyle = [styles.text, { color: 'white' }];

    return (
      <SafeAreaView style={{ flex: 1 }}>
        <TransitionView navigation={navigation}>
          <View
            style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}
          >
            <ScalableImage
              source={Icon}
              width={35}
              style={{ marginBottom: 20, marginTop: 30 }}
            />

            <View style={{ height: 240 }}>
              <ScrollView
                ref={el => (this.scrollView = el)}
                pagingEnabled={true}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                onScrollBeginDrag={this.onScrollBegin}
                onScrollEndDrag={this.onScrollEnd}
                onMomentumScrollEnd={this.onMomentumScrollEnd}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    flex: 0
                  }}
                >
                  <Feature
                    title="Welcome to Actual"
                    subtitle={
                      <Text>
                        Actual is a privacy-focused app that lets you track your
                        finances without all the fuss. Create your own budgeting
                        workflows quickly and discover your spending habits.{' '}
                        <ExternalLink href="https://actualbudget.github.io/docs/">
                          Learn more
                        </ExternalLink>
                      </Text>
                    }
                  />
                  <Feature
                    title="Powerful budgeting made simple"
                    subtitle="Based on tried and true methods, our budgeting system is based off of your real income instead of made up numbers."
                  />
                  <Feature
                    title="The fastest way to manage transactions"
                    subtitle="Breeze through your transactions and update them easily with a streamlined, minimal interface."
                  />
                  <Feature
                    title="A privacy-focused approach"
                    subtitle="All of your data exists locally and is always available. We only upload your data to our servers when syncing across devices, and we encrypt it so even we can't read it."
                  />
                </View>
              </ScrollView>
              <View style={{ alignItems: 'center' }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    width: 45
                  }}
                >
                  <SlideshowIndicator selected={selectedFeature === 0} />
                  <SlideshowIndicator selected={selectedFeature === 1} />
                  <SlideshowIndicator selected={selectedFeature === 2} />
                  <SlideshowIndicator selected={selectedFeature === 3} />
                </View>
              </View>
            </View>
          </View>

          <View
            style={{
              marginHorizontal: 50,
              marginBottom: 15,
              justifyContent: 'flex-end'
            }}
          >
            <Button
              primary
              style={{ marginBottom: 10, backgroundColor: 'white' }}
              contentStyle={{ borderWidth: 0 }}
              textStyle={{ fontSize: 17, color: colors.n1 }}
              onPress={() => {
                navigation.navigate('SubscribeEmail');
              }}
            >
              Get started
            </Button>
            <Button
              style={{
                marginBottom: 10,
                backgroundColor: 'rgba(180, 180, 180, .15)'
              }}
              contentStyle={{ borderWidth: 0 }}
              textStyle={{ fontSize: 17, color: 'white' }}
              onPress={() => {
                navigation.navigate('Login');
              }}
            >
              Log in
            </Button>
          </View>
          <Button
            bare
            textStyle={{ fontWeight: 'bold', fontSize: 15, color: 'white' }}
            style={{ padding: 10, alignSelf: 'center' }}
            onPress={() => createBudget({ demoMode: true })}
          >
            Try demo
          </Button>
        </TransitionView>
      </SafeAreaView>
    );
  }
}

export default connect(
  null,
  dispatch => bindActionCreators(actions, dispatch)
)(Intro);
