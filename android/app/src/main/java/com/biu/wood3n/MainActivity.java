package com.biu.wood3n;

import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

import android.util.Log;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BiuCookiePlugin.class);
        registerPlugin(BiuHttpPlugin.class);
        registerPlugin(BiuPlayerPlugin.class);
        super.onCreate(savedInstanceState);

        // Allow loading HTTP images inside the HTTPS localhost page
        WebSettings ws = this.bridge.getWebView().getSettings();
        ws.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // Inject Referer header for bilibili CDN requests (audio/video/image streams)
        this.bridge.setWebViewClient(new BridgeWebViewClient(this.bridge) {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (needsRefererInjection(url)) {
                    Log.d("BiuWebView", "Intercepting: " + url.substring(0, Math.min(url.length(), 120)));
                    try {
                        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                        conn.setRequestMethod(request.getMethod());
                        conn.setInstanceFollowRedirects(true);
                        conn.setConnectTimeout(15000);
                        conn.setReadTimeout(30000);

                        // Copy original headers
                        for (Map.Entry<String, String> entry : request.getRequestHeaders().entrySet()) {
                            conn.setRequestProperty(entry.getKey(), entry.getValue());
                        }
                        // Inject Referer and desktop User-Agent (CDN rejects Android WebView UA)
                        conn.setRequestProperty("Referer", "https://www.bilibili.com");
                        conn.setRequestProperty("User-Agent",
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36");
                        conn.connect();

                        int status = conn.getResponseCode();
                        String contentType = conn.getContentType();
                        String mimeType = contentType != null ? contentType.split(";")[0].trim() : "application/octet-stream";

                        // Fix MIME type for .m4s audio/video segments — bilibili CDN
                        // often returns application/octet-stream which <audio> can't play
                        if (url.contains(".m4s") && (mimeType.equals("application/octet-stream") || mimeType.equals("video/mp4"))) {
                            mimeType = "audio/mp4";
                        }

                        String encoding = conn.getContentEncoding();
                        Log.d("BiuWebView", "Response: status=" + status + " mime=" + mimeType);

                        Map<String, String> responseHeaders = new HashMap<>();
                        for (Map.Entry<String, List<String>> entry : conn.getHeaderFields().entrySet()) {
                            String key = entry.getKey();
                            if (key != null && !entry.getValue().isEmpty()) {
                                responseHeaders.put(key, entry.getValue().get(entry.getValue().size() - 1));
                            }
                        }
                        // Ensure CORS headers so the audio element can read the response
                        responseHeaders.put("Access-Control-Allow-Origin", "*");

                        InputStream stream;
                        if (status >= 400) {
                            stream = conn.getErrorStream();
                        } else {
                            stream = conn.getInputStream();
                        }

                        return new WebResourceResponse(mimeType, encoding, status,
                                conn.getResponseMessage() != null ? conn.getResponseMessage() : "OK",
                                responseHeaders, stream);
                    } catch (Exception e) {
                        Log.e("BiuWebView", "Intercept failed: " + e.getMessage());
                        // Fall through to default handling
                    }
                }
                return super.shouldInterceptRequest(view, request);
            }

            private boolean needsRefererInjection(String url) {
                return url.contains(".bilivideo.com") ||
                       url.contains(".hdslb.com") ||
                       url.contains("upos-sz-") ||
                       url.contains("cn-") && url.contains("bilivideo");
            }
        });
    }

    @Override
    public void onBackPressed() {
        Bridge currentBridge = this.bridge;

        if (currentBridge != null) {
            currentBridge.triggerWindowJSEvent("biuandroidbackbutton");
            return;
        }

        super.onBackPressed();
    }
}
