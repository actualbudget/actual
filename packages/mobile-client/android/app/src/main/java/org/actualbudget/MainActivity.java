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
        appLock = new AppLock(this, getBridge().getWebView());
    }

    @Override
    public void onStart() {
        super.onStart();
        appLock.onStart();
    }

    @Override
    public void onStop() {
        super.onStop();
        appLock.onStop();
    }
}
