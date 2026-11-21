package org.actualbudget;

import static androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK;
import static androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL;

import android.app.KeyguardManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.FrameLayout;
import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import java.util.function.Consumer;

// Optional lock that asks for biometrics or the device PIN, pattern or
// password before the app can be used: at launch and every time it returns
// from the background. The setting lives in SharedPreferences rather than in
// the web app's storage so the lock is enforced here, before any of the web
// app is shown.
//
// While the lock is turned on the window is also marked secure, which keeps
// budget data out of the recent apps screen (and out of screenshots).
class AppLock {

    private static final String PREFERENCES = "AppLock";
    private static final String ENABLED_KEY = "appLockEnabled";

    private final FragmentActivity activity;
    private final View webView;
    private final SharedPreferences preferences;

    private View cover;
    private Button unlockButton;
    private boolean isLocked = false;
    private boolean isAuthenticating = false;
    // The system prompt is shown once each time the app comes to the
    // foreground; after it is cancelled the user has the Unlock button.
    private boolean shouldPromptWhenStarted = false;

    // Created with the activity, so a cold launch starts out locked.
    AppLock(FragmentActivity activity, View webView) {
        this.activity = activity;
        this.webView = webView;
        this.preferences = activity.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
        applySecureFlag();
        if (isEnabled()) {
            lock();
        }
    }

    // Status reported to the web app

    boolean isEnabled() {
        return preferences.getBoolean(ENABLED_KEY, false);
    }

    // False when the device has no PIN, pattern or password, so there is
    // nothing to ask for.
    boolean isAvailable() {
        return activity.getSystemService(KeyguardManager.class).isDeviceSecure();
    }

    // Android does not say whether it would offer a fingerprint or a face.
    String biometry() {
        boolean hasBiometrics = BiometricManager.from(activity).canAuthenticate(BIOMETRIC_WEAK) == BiometricManager.BIOMETRIC_SUCCESS;
        return hasBiometrics ? "biometrics" : "none";
    }

    // Turning the lock on or off asks for authentication first, so the
    // setting cannot be changed by someone who could not unlock the app.
    // Must be called on the main thread; `completion` is run there too.
    void setEnabled(boolean enabled, String reason, Runnable completion) {
        if (enabled == isEnabled() || isAuthenticating || !canAuthenticate()) {
            completion.run();
            return;
        }
        authenticate(
            reason,
            success -> {
                if (success) {
                    storeEnabled(enabled);
                }
                completion.run();
            }
        );
    }

    private void storeEnabled(boolean enabled) {
        preferences.edit().putBoolean(ENABLED_KEY, enabled).apply();
        applySecureFlag();
    }

    private void applySecureFlag() {
        if (isEnabled()) {
            activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        } else {
            activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
        }
    }

    // Activity life cycle (called by MainActivity)

    void onStop() {
        if (isEnabled()) {
            lock();
        }
    }

    void onStart() {
        if (isLocked && shouldPromptWhenStarted) {
            shouldPromptWhenStarted = false;
            unlock();
        }
    }

    private void lock() {
        isLocked = true;
        shouldPromptWhenStarted = true;
        activity.getSystemService(InputMethodManager.class).hideSoftInputFromWindow(webView.getWindowToken(), 0);
        showCover();
    }

    // Authentication

    private void unlock() {
        if (!isLocked || isAuthenticating) {
            return;
        }
        if (!canAuthenticate()) {
            if (!isEnabled()) {
                isLocked = false;
                hideCover();
            }
            return;
        }
        authenticate("Unlock Actual Budget", success -> {});
    }

    // Whether the device has a way to authenticate.
    private boolean canAuthenticate() {
        if (isAvailable()) {
            return true;
        }
        // The screen lock was removed from the device, which leaves nothing
        // to authenticate with. Removing it takes the PIN itself, so the lock
        // is turned off instead of locking the user out of their budget.
        storeEnabled(false);
        return false;
    }

    // Anyone who authenticates is the device owner, so success always unlocks.
    private void authenticate(String title, Consumer<Boolean> completion) {
        // The prompt silently does nothing once the activity has saved its
        // state, which would leave this waiting for an answer forever.
        if (activity.getSupportFragmentManager().isStateSaved()) {
            completion.accept(false);
            return;
        }
        isAuthenticating = true;
        updateCover();
        BiometricPrompt.AuthenticationCallback callback = new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                finish(true);
            }

            @Override
            public void onAuthenticationError(int errorCode, @NonNull CharSequence errorMessage) {
                finish(false);
            }

            private void finish(boolean success) {
                isAuthenticating = false;
                if (success) {
                    isLocked = false;
                    hideCover();
                } else {
                    updateCover();
                }
                completion.accept(success);
            }
        };
        BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setAllowedAuthenticators(BIOMETRIC_WEAK | DEVICE_CREDENTIAL)
            .build();
        new BiometricPrompt(activity, ContextCompat.getMainExecutor(activity), callback).authenticate(promptInfo);
    }

    // Cover

    // What is shown instead of the app while it is locked: the same image as
    // the launch screen, plus a button to bring the system prompt back after
    // it was cancelled. The web view is hidden too, so that nothing can read
    // the budget from underneath the cover.
    private void showCover() {
        if (cover == null) {
            FrameLayout layout = new FrameLayout(activity);
            layout.setBackgroundResource(R.drawable.splash);
            layout.setClickable(true);

            unlockButton = new Button(activity);
            unlockButton.setText("Unlock");
            unlockButton.setOnClickListener(view -> unlock());
            FrameLayout.LayoutParams buttonLayout = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL
            );
            buttonLayout.bottomMargin = Math.round(96 * activity.getResources().getDisplayMetrics().density);
            layout.addView(unlockButton, buttonLayout);

            activity.addContentView(
                layout,
                new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            );
            cover = layout;
        }
        cover.setVisibility(View.VISIBLE);
        webView.setVisibility(View.INVISIBLE);
        updateCover();
    }

    private void hideCover() {
        if (cover != null) {
            cover.setVisibility(View.GONE);
        }
        webView.setVisibility(View.VISIBLE);
    }

    private void updateCover() {
        if (unlockButton != null) {
            unlockButton.setVisibility(isLocked && !isAuthenticating ? View.VISIBLE : View.INVISIBLE);
        }
    }
}
