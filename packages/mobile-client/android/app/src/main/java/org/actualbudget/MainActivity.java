package org.actualbudget;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    AppLock appLock;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Plugins that come from packages register themselves; the ones
        // written in this app are added here.
        registerPlugin(AppLockPlugin.class);
        super.onCreate(savedInstanceState);
        // There is no bridge when the device has no web view to show the app in.
        if (getBridge() != null) {
            appLock = new AppLock(this, getBridge().getWebView());
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        if (appLock != null) {
            appLock.onStart();
        }
    }

    @Override
    public void onStop() {
        super.onStop();
        if (appLock != null) {
            appLock.onStop();
        }
    }
}
