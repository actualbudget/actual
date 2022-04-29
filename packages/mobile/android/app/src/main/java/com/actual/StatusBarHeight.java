package com.actual;

import android.content.res.Resources;
import android.util.DisplayMetrics;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.util.Map;
import java.util.HashMap;

public class StatusBarHeight extends ReactContextBaseJavaModule {
    private static ReactApplicationContext reactContext;

    StatusBarHeight(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "StatusBarHeight";
    }

    @Override
    public Map<String, Object> getConstants() {
        DisplayMetrics metrics = reactContext.getResources().getDisplayMetrics();

        int statusBarHeight = 0;
        int resourceId = reactContext.getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (resourceId > 0) {
            int statusBarHeightPixels = reactContext.getResources().getDimensionPixelSize(resourceId);
            statusBarHeight = (int) ((statusBarHeightPixels) / (metrics.densityDpi / 160f));
        }

        int navBarHeight = 0;
        resourceId = reactContext.getResources().getIdentifier("navigation_bar_height", "dimen", "android");
        if (resourceId > 0) {
            int navBarHeightPixels = reactContext.getResources().getDimensionPixelSize(resourceId);
            navBarHeight = (int) ((navBarHeightPixels) / (metrics.densityDpi / 160f));
        }

        final Map<String, Object> constants = new HashMap<>();
        constants.put("statusBarHeight", statusBarHeight);
        constants.put("navBarHeight", navBarHeight);
        return constants;
    }
}
