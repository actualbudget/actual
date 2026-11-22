package org.actualbudget;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // There is no bridge when the device has no usable web view.
        if (getBridge() != null) {
            BackgroundSyncWorker.start(getBridge());
        }
    }

    @Override
    public void onDestroy() {
        BackgroundSyncWorker.stop();
        super.onDestroy();
    }
}
