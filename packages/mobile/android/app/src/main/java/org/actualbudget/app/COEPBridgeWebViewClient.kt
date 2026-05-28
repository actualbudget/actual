package org.actualbudget.app

import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import com.getcapacitor.Bridge
import com.getcapacitor.BridgeWebViewClient

/**
 * Makes the Android WebView cross-origin isolated so `SharedArrayBuffer` is
 * available (required by loot-core's sql.js/absurd-sql backend for full
 * performance).
 *
 * Capacitor serves the bundled web assets from https://localhost via its
 * WebViewLocalServer. That server does not emit the COOP/COEP headers the
 * browser needs to set `crossOriginIsolated = true`. This subclass wraps the
 * intercepted response and stamps the required headers onto it.
 *
 * Wiring (done once, after `npx cap add android`) in MainActivity:
 *
 *     class MainActivity : BridgeActivity() {
 *       override fun onStart() {
 *         super.onStart()
 *         bridge.webView.webViewClient = COEPBridgeWebViewClient(bridge)
 *       }
 *     }
 *
 * If this is not wired up, the app still works: the web layer detects the
 * missing cross-origin isolation and automatically falls back to the slower
 * no-SharedArrayBuffer mode (see browser-preload.js). On mobile there is only a
 * single WebView, so that fallback is safe (no multi-tab merge risk).
 */
class COEPBridgeWebViewClient(bridge: Bridge) : BridgeWebViewClient(bridge) {
  override fun shouldInterceptRequest(
    view: WebView,
    request: WebResourceRequest,
  ): WebResourceResponse? {
    val response = super.shouldInterceptRequest(view, request) ?: return null

    val headers = HashMap(response.responseHeaders ?: emptyMap())
    headers["Cross-Origin-Opener-Policy"] = "same-origin"
    headers["Cross-Origin-Embedder-Policy"] = "require-corp"
    headers["Cross-Origin-Resource-Policy"] = "same-origin"
    response.responseHeaders = headers

    return response
  }
}
