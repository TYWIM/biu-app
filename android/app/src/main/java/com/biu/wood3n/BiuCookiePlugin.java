package com.biu.wood3n;

import android.net.Uri;
import android.webkit.CookieManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

@CapacitorPlugin(name = "BiuCookie")
public class BiuCookiePlugin extends Plugin {
    private static final String DEFAULT_URL = "https://www.bilibili.com";

    @PluginMethod
    public void getCookie(PluginCall call) {
        String name = call.getString("name");
        if (name == null || name.trim().isEmpty()) {
            call.reject("Cookie name is required");
            return;
        }

        String url = call.getString("url", DEFAULT_URL);
        CookieManager cookieManager = CookieManager.getInstance();
        String cookieString = cookieManager.getCookie(url);

        JSObject result = new JSObject();
        result.put("value", findCookieValue(cookieString, name));
        call.resolve(result);
    }

    @PluginMethod
    public void setCookie(PluginCall call) {
        String name = call.getString("name");
        String value = call.getString("value");
        if (name == null || name.trim().isEmpty()) {
            call.reject("Cookie name is required");
            return;
        }
        if (value == null) {
            call.reject("Cookie value is required");
            return;
        }

        String url = call.getString("url", DEFAULT_URL);
        Double expirationDate = call.getDouble("expirationDate");
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setCookie(url, buildCookieString(url, name, value, expirationDate), success -> {
            if (success) {
                cookieManager.flush();
                call.resolve();
                return;
            }
            call.reject("Failed to set cookie");
        });
    }

    private String findCookieValue(String cookieString, String name) {
        if (cookieString == null || cookieString.isEmpty()) {
            return null;
        }

        String[] cookies = cookieString.split(";");
        for (String cookie : cookies) {
            String[] parts = cookie.trim().split("=", 2);
            if (parts.length == 2 && name.equals(parts[0])) {
                return Uri.decode(parts[1]);
            }
        }

        return null;
    }

    private String buildCookieString(String url, String name, String value, Double expirationDate) {
        StringBuilder cookie = new StringBuilder();
        cookie.append(name).append("=").append(Uri.encode(value));
        cookie.append("; Path=/");
        cookie.append("; Secure");
        cookie.append("; SameSite=None");

        String domain = resolveCookieDomain(url);
        if (domain != null) {
            cookie.append("; Domain=").append(domain);
        }

        if (expirationDate != null) {
            cookie.append("; Expires=").append(formatCookieDate(expirationDate.longValue() * 1000L));
        }

        return cookie.toString();
    }

    private String resolveCookieDomain(String url) {
        Uri uri = Uri.parse(url);
        String host = uri.getHost();
        if (host == null || host.isEmpty()) {
            return null;
        }
        if (host.endsWith("bilibili.com")) {
            return ".bilibili.com";
        }
        return host;
    }

    private String formatCookieDate(long timestamp) {
        SimpleDateFormat formatter = new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss 'GMT'", Locale.US);
        formatter.setTimeZone(TimeZone.getTimeZone("GMT"));
        return formatter.format(new Date(timestamp));
    }
}
