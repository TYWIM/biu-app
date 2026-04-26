package com.biu.wood3n;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Environment;
import android.util.Log;

import androidx.annotation.NonNull;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Biu Download Plugin for Android.
 * Manages media downloads using Android DownloadManager.
 * Supports audio/video downloads with progress tracking.
 */
@CapacitorPlugin(name = "BiuDownload")
public class BiuDownloadPlugin extends Plugin {

    private static final String TAG = "BiuDownload";
    private static final int MAX_CONCURRENT_DOWNLOADS = 3;

    private DownloadManager downloadManager;
    private final Map<Long, DownloadTask> activeDownloads = new HashMap<>();
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private volatile boolean isProgressTracking = false;

    private BroadcastReceiver downloadCompleteReceiver;

    @Override
    public void load() {
        downloadManager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
        registerDownloadCompleteReceiver();
    }

    @Override
    protected void handleOnDestroy() {
        stopProgressTracking();
        unregisterDownloadCompleteReceiver();
        executor.shutdown();
        super.handleOnDestroy();
    }

    private void registerDownloadCompleteReceiver() {
        downloadCompleteReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(intent.getAction())) {
                    long downloadId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                    if (downloadId != -1) {
                        handleDownloadComplete(downloadId);
                    }
                }
            }
        };
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(
                downloadCompleteReceiver,
                new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE),
                Context.RECEIVER_EXPORTED
            );
        } else {
            getContext().registerReceiver(
                downloadCompleteReceiver,
                new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
            );
        }
    }

    private void unregisterDownloadCompleteReceiver() {
        if (downloadCompleteReceiver != null) {
            try {
                getContext().unregisterReceiver(downloadCompleteReceiver);
            } catch (IllegalArgumentException e) {
                Log.w(TAG, "Receiver not registered");
            }
            downloadCompleteReceiver = null;
        }
    }

    @PluginMethod
    public void download(PluginCall call) {
        String url = call.getString("url");
        String title = call.getString("title", "download");
        String fileName = call.getString("fileName");
        String outputFileType = call.getString("outputFileType", "audio");
        JSObject headers = call.getObject("headers", new JSObject());

        if (url == null || url.isEmpty()) {
            call.reject("url is required");
            return;
        }

        if (activeDownloads.size() >= MAX_CONCURRENT_DOWNLOADS) {
            call.reject("too many concurrent downloads");
            return;
        }

        String finalFileName = fileName != null ? fileName : generateFileName(title, outputFileType);
        String subDir = outputFileType.equals("video") ? "Videos" : "Music";

        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
        request.setTitle(title);
        request.setDescription("Biu " + outputFileType + " download");
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
        request.setDestinationInExternalFilesDir(getContext(), Environment.DIRECTORY_DOWNLOADS + "/Biu/" + subDir, finalFileName);
        request.setAllowedOverRoaming(false);

        // Add custom headers
        if (headers != null) {
            try {
                JSONObject headersJson = new JSONObject(headers.toString());
                Iterator<String> keys = headersJson.keys();
                while (keys.hasNext()) {
                    String key = keys.next();
                    String value = headersJson.optString(key, "");
                    if (!value.isEmpty()) {
                        request.addRequestHeader(key, value);
                    }
                }
            } catch (JSONException e) {
                Log.w(TAG, "Failed to parse headers", e);
            }
        }

        long downloadId = downloadManager.enqueue(request);

        DownloadTask task = new DownloadTask(downloadId, title, outputFileType, finalFileName);
        synchronized (activeDownloads) {
            activeDownloads.put(downloadId, task);
        }

        JSObject result = new JSObject();
        result.put("downloadId", downloadId);
        result.put("status", "pending");
        call.resolve(result);

        startProgressTracking();
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) {
        long downloadId = call.getLong("downloadId", -1L);
        if (downloadId == -1L) {
            call.reject("downloadId is required");
            return;
        }

        downloadManager.remove(downloadId);
        synchronized (activeDownloads) {
            activeDownloads.remove(downloadId);
        }

        call.resolve();
    }

    @PluginMethod
    public void getDownloadList(PluginCall call) {
        JSArray list = new JSArray();

        synchronized (activeDownloads) {
            for (DownloadTask task : activeDownloads.values()) {
                JSObject item = task.toJSObject();
                if (item != null) {
                    list.put(item);
                }
            }
        }

        JSObject result = new JSObject();
        result.put("list", list);
        call.resolve(result);
    }

    @PluginMethod
    public void getDownloadProgress(PluginCall call) {
        long downloadId = call.getLong("downloadId", -1L);
        if (downloadId == -1L) {
            call.reject("downloadId is required");
            return;
        }

        DownloadTask task;
        synchronized (activeDownloads) {
            task = activeDownloads.get(downloadId);
        }

        if (task == null) {
            call.reject("download not found");
            return;
        }

        call.resolve(task.toJSObject());
    }

    @PluginMethod
    public void deleteDownload(PluginCall call) {
        String filePath = call.getString("filePath");
        if (filePath == null || filePath.isEmpty()) {
            call.reject("filePath is required");
            return;
        }

        File file = new File(filePath);
        boolean deleted = file.delete();

        JSObject result = new JSObject();
        result.put("success", deleted);
        call.resolve(result);
    }

    @PluginMethod
    public void getDownloadedFiles(PluginCall call) {
        String outputFileType = call.getString("outputFileType", "audio");
        String subDir = outputFileType.equals("video") ? "Videos" : "Music";
        File dir = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS + "/Biu/" + subDir);

        JSArray list = new JSArray();
        if (dir != null && dir.exists()) {
            File[] files = dir.listFiles();
            if (files != null) {
                for (File file : files) {
                    if (file.isFile()) {
                        JSObject item = new JSObject();
                        item.put("fileName", file.getName());
                        item.put("filePath", file.getAbsolutePath());
                        item.put("size", file.length());
                        item.put("lastModified", file.lastModified());
                        list.put(item);
                    }
                }
            }
        }

        JSObject result = new JSObject();
        result.put("list", list);
        call.resolve(result);
    }

    private void handleDownloadComplete(long downloadId) {
        DownloadTask task;
        synchronized (activeDownloads) {
            task = activeDownloads.get(downloadId);
        }

        if (task == null) return;

        DownloadManager.Query query = new DownloadManager.Query();
        query.setFilterById(downloadId);
        Cursor cursor = downloadManager.query(query);

        if (cursor != null && cursor.moveToFirst()) {
            int statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
            int status = cursor.getInt(statusIndex);

            if (status == DownloadManager.STATUS_SUCCESSFUL) {
                task.status = "completed";
                task.progress = 100;
                int uriIndex = cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI);
                task.localUri = cursor.getString(uriIndex);
            } else if (status == DownloadManager.STATUS_FAILED) {
                task.status = "failed";
                int reasonIndex = cursor.getColumnIndex(DownloadManager.COLUMN_REASON);
                task.error = "Download failed: " + cursor.getInt(reasonIndex);
            }

            JSObject event = task.toJSObject();
            notifyListeners("downloadComplete", event);
        }

        if (cursor != null) {
            cursor.close();
        }
    }

    private void startProgressTracking() {
        if (isProgressTracking) return;
        isProgressTracking = true;

        executor.execute(() -> {
            while (isProgressTracking) {
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }

                synchronized (activeDownloads) {
                    if (activeDownloads.isEmpty()) {
                        isProgressTracking = false;
                        break;
                    }

                    for (Map.Entry<Long, DownloadTask> entry : activeDownloads.entrySet()) {
                        long downloadId = entry.getKey();
                        DownloadTask task = entry.getValue();

                        if (task.status.equals("completed") || task.status.equals("failed")) {
                            continue;
                        }

                        DownloadManager.Query query = new DownloadManager.Query();
                        query.setFilterById(downloadId);
                        Cursor cursor = downloadManager.query(query);

                        if (cursor != null && cursor.moveToFirst()) {
                            int bytesDownloadedIndex = cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR);
                            int bytesTotalIndex = cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES);
                            int statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);

                            long bytesDownloaded = cursor.getLong(bytesDownloadedIndex);
                            long bytesTotal = cursor.getLong(bytesTotalIndex);
                            int status = cursor.getInt(statusIndex);

                            if (bytesTotal > 0) {
                                task.progress = (int) ((bytesDownloaded * 100) / bytesTotal);
                            }

                            if (status == DownloadManager.STATUS_PENDING) {
                                task.status = "pending";
                            } else if (status == DownloadManager.STATUS_RUNNING) {
                                task.status = "downloading";
                            } else if (status == DownloadManager.STATUS_PAUSED) {
                                task.status = "paused";
                            }

                            JSObject event = task.toJSObject();
                            notifyListeners("downloadProgress", event);

                            cursor.close();
                        }
                    }
                }
            }
        });
    }

    private void stopProgressTracking() {
        isProgressTracking = false;
    }

    @NonNull
    private String generateFileName(String title, String outputFileType) {
        String safeTitle = title.replaceAll("[^a-zA-Z0-9\\u4e00-\\u9fa5]", "_");
        String extension = outputFileType.equals("video") ? "mp4" : "m4a";
        return safeTitle + "_" + System.currentTimeMillis() + "." + extension;
    }

    private static class DownloadTask {
        long downloadId;
        String title;
        String outputFileType;
        String fileName;
        String status;
        int progress;
        String localUri;
        String error;

        DownloadTask(long downloadId, String title, String outputFileType, String fileName) {
            this.downloadId = downloadId;
            this.title = title;
            this.outputFileType = outputFileType;
            this.fileName = fileName;
            this.status = "pending";
            this.progress = 0;
        }

        JSObject toJSObject() {
            JSObject obj = new JSObject();
            obj.put("downloadId", downloadId);
            obj.put("title", title);
            obj.put("outputFileType", outputFileType);
            obj.put("fileName", fileName);
            obj.put("status", status);
            obj.put("progress", progress);
            if (localUri != null) {
                obj.put("localUri", localUri);
            }
            if (error != null) {
                obj.put("error", error);
            }
            return obj;
        }
    }
}
