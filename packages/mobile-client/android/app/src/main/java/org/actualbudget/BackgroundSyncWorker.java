package org.actualbudget;

import android.content.Context;
import android.webkit.JavascriptInterface;
import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import com.getcapacitor.Bridge;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

// Syncs the open budget every now and then while the app is not in use.
//
// The sync code and the database live in the web view, so the web app does the
// work (see useBackgroundSync.ts) and calls back when it has finished.
//
// ponytail: only syncs while Android keeps the app (and so its web view) in
// memory. Once the system has removed it there is no web view to ask, and the
// schedule stops until the app is opened again. Load the web app in a web view
// of the worker's own if that turns out to be the common case.
public class BackgroundSyncWorker extends Worker {

    private static final String WORK_NAME = "background-sync";

    private static volatile Bridge bridge;
    private static volatile CountDownLatch pendingSync = new CountDownLatch(0);

    public static class Callbacks {

        @JavascriptInterface
        public void done() {
            pendingSync.countDown();
        }
    }

    public BackgroundSyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    static void start(Bridge appBridge) {
        bridge = appBridge;
        appBridge.getWebView().addJavascriptInterface(new Callbacks(), "ActualBackgroundSync");

        // 15 minutes is the shortest interval Android allows; it runs the
        // work later than that when the device is idle or offline.
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(BackgroundSyncWorker.class, 15, TimeUnit.MINUTES)
            .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build();
        WorkManager.getInstance(appBridge.getContext()).enqueueUniquePeriodicWork(
            WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            request
        );
    }

    static void stop() {
        bridge = null;
    }

    @NonNull
    @Override
    public Result doWork() {
        Bridge appBridge = bridge;
        if (appBridge == null) {
            // Android started the app just for this, without its web view.
            // Stop the schedule so that does not repeat every 15 minutes;
            // opening the app starts it again.
            WorkManager.getInstance(getApplicationContext()).cancelUniqueWork(WORK_NAME);
            return Result.success();
        }

        CountDownLatch sync = new CountDownLatch(1);
        pendingSync = sync;
        appBridge.eval(
            "window.dispatchEvent(new CustomEvent('actual-background-sync', { detail: () => ActualBackgroundSync.done() }))",
            null
        );
        try {
            // Nothing answers while the web app is still loading: do not hold
            // the device awake for the 10 minutes a worker may run.
            sync.await(1, TimeUnit.MINUTES);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return Result.success();
    }
}
