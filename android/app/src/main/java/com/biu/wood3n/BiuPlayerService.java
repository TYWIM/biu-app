package com.biu.wood3n;

import android.content.Intent;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.media3.session.DefaultMediaNotificationProvider;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

public class BiuPlayerService extends MediaSessionService {
    public static final String ACTION_START = "com.biu.wood3n.action.START_PLAYER";
    private static final String TAG = "BiuPlayerService";

    private MediaSession attachSession() {
        MediaSession mediaSession = BiuPlayerManager.getInstance(this).attachService(this);
        return mediaSession;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "service created");
        DefaultMediaNotificationProvider notificationProvider = new DefaultMediaNotificationProvider(this);
        notificationProvider.setSmallIcon(R.mipmap.ic_launcher);
        setMediaNotificationProvider(notificationProvider);
        BiuPlayerManager.getInstance(this).restorePlaybackAfterServiceRestart();
        attachSession();
    }

    @Override
    public int onStartCommand(@Nullable Intent intent, int flags, int startId) {
        super.onStartCommand(intent, flags, startId);
        Log.i(TAG, "service start action=" + (intent == null ? "null" : intent.getAction())
                + " flags=" + flags + " startId=" + startId);
        boolean startInForegroundRequired = intent != null && ACTION_START.equals(intent.getAction());
        MediaSession mediaSession = attachSession();
        if (startInForegroundRequired && mediaSession != null) {
            onUpdateNotification(mediaSession, true);
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        Log.i(TAG, "service destroyed");
        BiuPlayerManager playerManager = BiuPlayerManager.getInstance(this);
        playerManager.detachService(this);
        playerManager.releasePlayer();
        super.onDestroy();
    }

    @Override
    public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return BiuPlayerManager.getInstance(this).getMediaSession();
    }
}
