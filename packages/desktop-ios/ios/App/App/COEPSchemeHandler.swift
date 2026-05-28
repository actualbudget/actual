import Foundation
import Capacitor
import WebKit

/// Makes the WKWebView cross-origin isolated so `SharedArrayBuffer` is available
/// (required by loot-core's sql.js/absurd-sql backend for full performance).
///
/// Capacitor serves the bundled web assets from a custom scheme
/// (`capacitor://localhost`) via its own `WKURLSchemeHandler`. That handler does
/// not emit the COOP/COEP headers that the browser needs to set
/// `crossOriginIsolated = true`. This subclass wraps Capacitor's handler and
/// stamps the required headers (and the correct `Content-Type` for `.wasm`) onto
/// every response.
///
/// Wiring (done once, in Xcode, after `npx cap add ios`):
///   1. Add this file to the `App` target.
///   2. In `AppDelegate` (or a `CAPBridgeViewController` subclass), after the
///      bridge's web view configuration is created, replace the registered
///      handler for the capacitor scheme with `COEPSchemeHandler(wrapping:)`,
///      passing the handler Capacitor already registered. See the package
///      README for the exact snippet.
///
/// If this handler is not wired up, the app still works: the web layer detects
/// the missing cross-origin isolation and automatically falls back to the
/// slower no-SharedArrayBuffer mode (see browser-preload.js). On iOS there is
/// only a single WebView, so that fallback is safe (no multi-tab merge risk).
@objc public class COEPSchemeHandler: NSObject, WKURLSchemeHandler {
  private let wrapped: WKURLSchemeHandler
  // Track tasks the wrapped handler is serving so we can intercept the response.
  private var proxies: [ObjectIdentifier: SchemeTaskProxy] = [:]

  @objc public init(wrapping handler: WKURLSchemeHandler) {
    self.wrapped = handler
  }

  public func webView(
    _ webView: WKWebView,
    start urlSchemeTask: WKURLSchemeTask
  ) {
    let proxy = SchemeTaskProxy(real: urlSchemeTask)
    proxies[ObjectIdentifier(urlSchemeTask)] = proxy
    wrapped.webView(webView, start: proxy)
  }

  public func webView(
    _ webView: WKWebView,
    stop urlSchemeTask: WKURLSchemeTask
  ) {
    let key = ObjectIdentifier(urlSchemeTask)
    if let proxy = proxies[key] {
      wrapped.webView(webView, stop: proxy)
      proxies.removeValue(forKey: key)
    } else {
      wrapped.webView(webView, stop: urlSchemeTask)
    }
  }
}

/// Forwards a scheme task to the real task while rewriting response headers to
/// enable cross-origin isolation.
private final class SchemeTaskProxy: NSObject, WKURLSchemeTask {
  private let real: WKURLSchemeTask
  init(real: WKURLSchemeTask) { self.real = real }

  var request: URLRequest { real.request }

  func didReceive(_ response: URLResponse) {
    guard let http = response as? HTTPURLResponse,
      let url = http.url
    else {
      real.didReceive(response)
      return
    }

    var headers = http.allHeaderFields as? [String: String] ?? [:]
    headers["Cross-Origin-Opener-Policy"] = "same-origin"
    headers["Cross-Origin-Embedder-Policy"] = "require-corp"
    headers["Cross-Origin-Resource-Policy"] = "same-origin"
    if url.pathExtension.lowercased() == "wasm" {
      headers["Content-Type"] = "application/wasm"
    }

    let rewritten =
      HTTPURLResponse(
        url: url,
        statusCode: http.statusCode,
        httpVersion: "HTTP/1.1",
        headerFields: headers
      ) ?? http
    real.didReceive(rewritten)
  }

  func didReceive(_ data: Data) { real.didReceive(data) }
  func didFinish() { real.didFinish() }
  func didFailWithError(_ error: Error) { real.didFailWithError(error) }
}
