package com.biu.wood3n;

import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

/**
 * Native HTTP proxy plugin for Android.
 * Bypasses WebView XHR forbidden-header restrictions so that headers like
 * Referer and User-Agent can be sent to bilibili APIs.
 */
@CapacitorPlugin(name = "BiuHttp")
public class BiuHttpPlugin extends Plugin {

    private static final String TAG = "BiuHttp";

    @PluginMethod
    public void request(PluginCall call) {
        String urlStr = call.getString("url");
        String method = call.getString("method", "GET");
        JSObject headers = call.getObject("headers", new JSObject());
        String body = call.getString("body", null);
        int timeout = call.getInt("timeout", 10000);

        Log.d(TAG, "request called: " + method + " " + urlStr);

        if (urlStr == null || urlStr.isEmpty()) {
            call.reject("url is required");
            return;
        }

        // Keep the call alive so it doesn't timeout while waiting for the HTTP response
        call.setKeepAlive(true);

        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                URL url = new URL(urlStr);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod(method.toUpperCase());
                conn.setConnectTimeout(timeout);
                conn.setReadTimeout(timeout);
                conn.setInstanceFollowRedirects(true);

                // Apply all headers from JS – no forbidden-header filtering here
                if (headers != null) {
                    Iterator<String> keys = headers.keys();
                    while (keys.hasNext()) {
                        String key = keys.next();
                        String value = headers.getString(key);
                        if (value != null) {
                            conn.setRequestProperty(key, value);
                        }
                    }
                }

                // Attach cookies from CookieManager
                android.webkit.CookieManager cookieManager = android.webkit.CookieManager.getInstance();
                String cookies = cookieManager.getCookie(urlStr);
                if (cookies != null && !cookies.isEmpty()) {
                    conn.setRequestProperty("Cookie", cookies);
                }

                // Write body if present
                if (body != null && !body.isEmpty()) {
                    conn.setDoOutput(true);
                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(body.getBytes(StandardCharsets.UTF_8));
                    }
                }

                int status = conn.getResponseCode();

                // Store any Set-Cookie headers back into CookieManager
                Map<String, List<String>> respHeaders = conn.getHeaderFields();
                if (respHeaders != null) {
                    List<String> setCookies = respHeaders.get("Set-Cookie");
                    if (setCookies == null) setCookies = respHeaders.get("set-cookie");
                    if (setCookies != null) {
                        for (String sc : setCookies) {
                            cookieManager.setCookie(urlStr, sc);
                        }
                    }
                }

                // Read response body
                InputStream is;
                try {
                    is = conn.getInputStream();
                } catch (Exception e) {
                    is = conn.getErrorStream();
                }

                String responseBody = "";
                if (is != null) {
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    byte[] buf = new byte[4096];
                    int n;
                    while ((n = is.read(buf)) != -1) {
                        baos.write(buf, 0, n);
                    }
                    is.close();
                    responseBody = baos.toString("UTF-8");
                }

                // Build response headers JSON
                JSObject respHeadersJson = new JSObject();
                if (respHeaders != null) {
                    for (Map.Entry<String, List<String>> entry : respHeaders.entrySet()) {
                        String key = entry.getKey();
                        if (key == null) continue;
                        List<String> vals = entry.getValue();
                        if (vals != null && !vals.isEmpty()) {
                            respHeadersJson.put(key.toLowerCase(), vals.get(vals.size() - 1));
                        }
                    }
                }

                JSObject result = new JSObject();
                result.put("status", status);
                result.put("data", responseBody);
                result.put("headers", respHeadersJson);
                Log.d(TAG, "resolving: " + status + " " + urlStr);
                call.resolve(result);
                call.setKeepAlive(false);

            } catch (Exception e) {
                Log.e(TAG, "Request failed: " + e.getMessage(), e);
                call.reject("Request failed: " + e.getMessage(), e);
                call.setKeepAlive(false);
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        }).start();
    }
}
