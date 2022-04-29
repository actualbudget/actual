package com.actual;

import android.app.Application;

import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
// import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;

import com.actual.StatusBarHeightPackage;
// import io.sentry.react.RNSentryPackage;
// import com.horcrux.svg.SvgPackage;
// import com.RNFetchBlob.RNFetchBlobPackage;
// import com.swmansion.reanimated.ReanimatedPackage;
// import com.swmansion.gesturehandler.react.RNGestureHandlerPackage;
// import com.janeasystems.rn_nodejs_mobile.RNNodeJsMobilePackage;
// import com.swmansion.rnscreens.RNScreensPackage;

import java.util.Arrays;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    @Override/**/
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      @SuppressWarnings("UnnecessaryLocalVariable")
      List<ReactPackage> packages = new PackageList(this).getPackages();
      packages.add(new StatusBarHeightPackage());
      return packages;
    }

    //       @Override/**/
    // protected List<ReactPackage> getPackages() {
    //   return Arrays.<ReactPackage>asList(
    //       new MainReactPackage(),
    //           new RNSentryPackage(),
    //       new RNFetchBlobPackage(),
    //       new ReanimatedPackage(),
    //       new RNGestureHandlerPackage(),
    //       new RNNodeJsMobilePackage(),
    //       new RNScreensPackage(),
    //       new SvgPackage(),
    //   );
    // }

    @Override
    protected String getJSMainModuleName() {
      return "index";
    }
  };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);
    //Plaid.create(this);
  }
}

