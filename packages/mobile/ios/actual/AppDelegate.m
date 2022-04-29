/**
 * Copyright (c) 2015-present, James Long
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#import "AppDelegate.h"

#import <UIKit/UIKit.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <React/RCTTextView.h>
#import <React/RCTLog.h>
#import "Actual-Swift.h"

// #import "MBFingerTipWindow.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  NSURL *jsCodeLocation;

#ifdef DEBUG
  jsCodeLocation = [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:nil];
#else
  jsCodeLocation = [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif

  // Always show logs, even if release
  RCTSetLogThreshold(RCTLogLevelInfo - 1);
  
  RCTRootView *rootView = [[RCTRootView alloc] initWithBundleURL:jsCodeLocation
                                                      moduleName:@"actual"
                                               initialProperties:nil
                                                   launchOptions:launchOptions];

  // [RNSentry installWithRootView:rootView];

  // Subscribe to in-app purchase notifications
  //
  // TODO:
  // * Unsubscribe when app terminates
  // * Handle payment completions after app loads
  // * Send basic emails on signup and such
  // * Rework the flow so that the user immediately pays first and
  //   that creates a user in the backend without an email. Then the
  //   first thing the user has to do is connect it to an email, with
  //   the option of re-validating the purchase if something went
  //   wrong. This makes it so that we know we have a successful
  //   subscription always in the backend account
  //
  // ACTInAppPurchase *iap = [rootView.bridge moduleForName:@"ACTInAppPurchase"];
  // [iap listen];

  rootView.backgroundColor = [[UIColor alloc] initWithRed:1.0f green:1.0f blue:1.0f alpha:1];

  // #ifdef DEBUG
//   MBFingerTipWindow *window = [[MBFingerTipWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
//   window.alwaysShowTouches = YES;
//   self.window = window;
// #else
  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
// #endif

  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];


  UIView *launchScreenView = [[NSBundle mainBundle] loadNibNamed:@"LaunchScreen" owner:self options: nil][0];
  launchScreenView.frame = self.window.bounds;
  rootView.loadingView = launchScreenView;

  return YES;
}

// - (BOOL)application:(UIApplication *)application willTerminate:(UIApplication *)application {
//   // TODO:
//   // ACTInAppPurchase *iap = [rootView.bridge moduleForName:@"ACTInAppPurchase"];
//   // [iap unlisten];
// }

@end
