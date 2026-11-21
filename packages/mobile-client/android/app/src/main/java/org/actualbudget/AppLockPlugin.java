package org.actualbudget;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Lets the web app's settings page read and change the app lock (see AppLock).
// It lives in the app rather than in a package, so it is registered by hand in
// MainActivity.
@CapacitorPlugin(name = "AppLock")
public class AppLockPlugin extends Plugin {

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(status());
    }

    // Resolves with the resulting status whether or not the user
    // authenticated: a cancelled prompt just leaves the setting as it was.
    @PluginMethod
    public void setEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled");
        String reason = call.getString("reason");
        if (enabled == null || reason == null || reason.isEmpty()) {
            call.reject("\"enabled\" and \"reason\" are required");
            return;
        }
        getActivity().runOnUiThread(() -> appLock().setEnabled(enabled, reason, () -> call.resolve(status())));
    }

    private AppLock appLock() {
        return ((MainActivity) getActivity()).appLock;
    }

    private JSObject status() {
        AppLock appLock = appLock();
        JSObject status = new JSObject();
        status.put("isAvailable", appLock.isAvailable());
        status.put("isEnabled", appLock.isEnabled());
        status.put("biometry", appLock.biometry());
        return status;
    }
}
